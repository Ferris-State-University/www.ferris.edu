/**
 * @module
 * This module does the lifting for the "Event Listing via RSS" component
 */

export const ModuleName: string = "Event Listing Via RSS Module";

import {ModuleName as appendCss} from "./AppendEventListingFromRssCss.js";
import {LogError} from "./ErrorReporting.js";

console.debug(`${ModuleName} loaded ${appendCss}`);

// noinspection SpellCheckingInspection
/**
 * Globals
 */
const CALENDAR_RSS_URL: string = "https://api.calendar.moderncampus.net/pubcalendar/" +
    "6c766263-8719-4764-a0df-af488b8d5bbe/rss" +
    "?url=https%3A%2F%2Fwww.ferris.edu%2Fcalendar%2Fhomepage.htm&hash=true&end=2099-12-31";
const CALENDAR_NS: string = "https://moderncampus.com/Data/cal/";

/**
 * Main execution start, logs errors
 */
main().catch((reason: any): never => {
    console.error(reason);
    LogError(reason);
    throw reason;
});

/**
 * Asynchronously processes all elements with the class "event-listing-via-rss" on the document.
 * For each element, it constructs a URL from predefined parameters, fetches an XML document,
 * extracts event data within specified constraints, and updates the element's inner HTML with formatted event data.
 *
 * @return {Promise<void>} A promise that resolves when all elements have been processed and updated.
 */
async function main(): Promise<void> {
    const eventListingElements: NodeListOf<HTMLElement> = document.querySelectorAll(".event-listing-via-rss");
    for (const element of eventListingElements) {
        const data: DataAttr = getDataAttr(element);

        const fullUrl: string = appendToUrl(CALENDAR_RSS_URL, data.tags, data.categories);

        const doc: XMLDocument = await fetchXmlDoc(fullUrl);

        const events: CalendarEvent[] = getEvents(doc, data.begin, data.end, data.count);

        element.innerHTML = getHtml(events, data.showYear);
    }
}

/**
 * Extracts custom data attributes from an HTML element and returns them as a structured object.
 *
 * @param {HTMLElement} element - The HTML element from which to retrieve the data attributes.
 * @return {DataAttr} A structured object containing the extracted data attributes or null if they are not present.
 */
function getDataAttr(element: HTMLElement): DataAttr {
    const rawData: DataAttr = {
        begin: element.getAttribute("data-begin"),
        end: element.getAttribute("data-end"),
        count: element.getAttribute("data-count"),
        tags: element.getAttribute("data-tags"),
        categories: element.getAttribute("data-categories"),
        showYear: element.getAttribute("data-show-year")
    };

    return {
        begin: isNullOrEmpty(rawData.begin) ? null : rawData.begin,
        end: isNullOrEmpty(rawData.end) ? null : rawData.end,
        count: isNullOrEmpty(rawData.count) ? null : rawData.count,
        tags: isNullOrEmpty(rawData.tags) ? null : rawData.tags,
        categories: isNullOrEmpty(rawData.categories) ? null : rawData.categories,
        showYear: isNullOrEmpty(rawData.showYear) ? null : rawData.showYear
    };
}

/**
 * Checks if the given string is null, undefined, or an empty string after trimming.
 *
 * @param {string | null | undefined} value - The string to be checked.
 * @return {boolean} - Returns true if the string is null, undefined, or empty; otherwise, false.
 */
function isNullOrEmpty(value: string | null | undefined): boolean {
    return value === null || value === undefined || value.trim() === '';
}


/**
 * Fetches an XML document from the specified URL.
 *
 * @param {string} url - The URL of the XML document to fetch.
 * @return {Promise<XMLDocument>} A promise that resolves to the fetched XMLDocument.
 */
async function fetchXmlDoc(url: string): Promise<XMLDocument> {
    const response: Response = await fetch(url);
    const text: string = await response.text();
    const parser: DOMParser = new DOMParser();
    return parser.parseFromString(text, "text/xml");
}

/**
 * Appends tags and categories to the given URL as query parameters.
 *
 * @param {string} url - The base URL to which tags and categories will be appended.
 * @param {string | null} [tags] - A comma-separated string of tags to append to the URL. Spaces within tags are replaced by '+'.
 * @param {string | null} [categories] - A comma-separated string of categories to append to the URL. Spaces within categories are replaced by '+'.
 * @return {string} The modified URL with appended tags and categories as query parameters.
 */
function appendToUrl(url: string, tags: string | null = null, categories: string | null = null): string {
    let newUrl: string = url;

    // Add tags to URL
    if (tags !== null) {
        const tagArray: string[] = tags.replaceAll(' ', '+').split(',');
        for (const tag of tagArray) {
            newUrl += "&tag=" + tag;
        }
    }

    // Add categories to URL
    if (categories !== null) {
        const categoryArray: string[] = categories.trim()
            .replaceAll(/ *, */g, ",")
            .replaceAll(' ', '+')
            .split(',');
        for (const category of categoryArray) {
            newUrl += "&tag=" + category;
        }
    }

    return newUrl;
}

/**
 * Retrieves calendar events from an XML document that fall within a specified date range and limits the result to a
 * specified number of events.
 *
 * @param {XMLDocument} doc - The XML document containing the event data.
 * @param {string | null} dataBegin - The start of the date range to filter events. If null, no start date filter is applied.
 * @param {string | null} dataEnd - The end of the date range to filter events. If null, no end date filter is applied.
 * @param {string | null} dataCount - The maximum number of events to retrieve. If null or invalid, defaults to a predefined number of events.
 * @return {CalendarEvent[]} A sorted array of calendar events occurring within the specified date range, limited to the specified count.
 */
function getEvents(doc: XMLDocument, dataBegin: string | null, dataEnd: string | null,
                   dataCount: string | null): CalendarEvent[] {
    const items: NodeListOf<Element> = doc.querySelectorAll("item");
    const events: CalendarEvent[] = [];
    for (const item of items) {
        const startElements: HTMLCollectionOf<Element> = item.getElementsByTagNameNS(CALENDAR_NS, "start");
        if (startElements.length === 0) continue;
        const endElements: HTMLCollectionOf<Element> = item.getElementsByTagNameNS(CALENDAR_NS, "end");
        if (endElements.length === 0) continue;
        const isWithinDateRange: boolean = eventWithinDateRange(startElements[0].textContent,
            endElements[0].textContent, dataBegin, dataEnd);
        if (!isWithinDateRange) continue;
        events.push({
            start: startElements[0].textContent,
            end: endElements[0].textContent,
            title: item.querySelector("title")?.textContent,
            description: item.querySelector("description")?.textContent,
            link: item.querySelector("link")?.textContent
        });
    }
    let numEventsToDisplay: number = 2;
    if (dataCount !== null) {
        const parsedCount: number = parseInt(dataCount);
        if (!isNaN(parsedCount)) {
            numEventsToDisplay = parsedCount;
        }
    }
    if (events.length < numEventsToDisplay) numEventsToDisplay = events.length;
    if (events.length === 0) return [];  // EARLY EXIT
    if (events.length > 1) {
        events.sort((a: CalendarEvent, b: CalendarEvent): number => {
            if (a.start === null && b.start === null) return 0;
            if (a.start === null) return -1;
            if (b.start === null) return 1;
            if (a.start < b.start) return -1;
            if (a.start > b.start) return 1;
            return 0;
        });
    }
    return events.slice(0, numEventsToDisplay);
}

/**
 * Generates an HTML string to display a list of calendar events with their details.
 *
 * @param {CalendarEvent[]} events - An array of event objects.
 * @param {string|null} dataShowYear - A string indicating whether to display the year.
 * @return {string} An HTML string representing the list of events and their details, or a message indicating that there are no events to display.
 */
function getHtml(events: CalendarEvent[], dataShowYear: string | null): string {
    if (events.length === 0) return "There are no events to display.";

    let htmlResult: string = '<div class="homeEvents row hasBackground"><div class="wrapper">';
    for (const event of events) {
        if (event.start === null || event.end === null) {
            console.trace(event);
            const errorMsg: string = "Event date is invalid";
            LogError(errorMsg);
            throw new Error(errorMsg);  // this should never happen
        }

        let hasTime: boolean = (event.start.indexOf('T') !== -1 && event.end.indexOf('T') !== -1);

        let startDateStr: string = event.start;
        if (event.start.indexOf('T') === -1) {
            startDateStr += "T00:00";
        }
        const startDate: Date = new Date(startDateStr);

        let endDateStr: string = event.end;
        if (event.end.indexOf('T') === -1) {
            endDateStr += "T23:59";
        }
        const endDate = new Date(endDateStr);

        const startMonthStr: string = startDate.toLocaleString("en-US", {month: "short"});
        const startDayStr: string = startDate.toLocaleString("en-US", {day: "numeric"});
        const startYearStr: string = startDate.toLocaleString("en-US", {year: "numeric"});
        const endMonthStr: string = endDate.toLocaleString("en-US", {month: "short"});
        const endDayStr: string = endDate.toLocaleString("en-US", {day: "numeric"});
        const endYearStr: string = endDate.toLocaleString("en-US", {year: "numeric"});
        const outTimeStr: string = startDate.toLocaleString("en-US", {timeStyle: "short"}) + " - " +
            endDate.toLocaleString("en-US", {timeStyle: "short"});

        let outMonthStr: string = startMonthStr;
        if (startMonthStr !== endMonthStr) {
            outMonthStr += "-" + endMonthStr;
        }

        let outDayStr: string = startDayStr;
        if (startDayStr !== endDayStr) {
            outDayStr += "-" + endDayStr;
        }

        let outYearStr: string = startYearStr;
        if (startYearStr !== endYearStr) {
            outYearStr += "-" + endYearStr;
        }

        const showYear: boolean = dataShowYear !== null && dataShowYear === "true";

        htmlResult += `
                <div class="eventWrap columns col2">
                    <div class="date">
                        <div class="dateWrap"><span class="month">${outMonthStr}</span><span class="day">${outDayStr}</span>
            `;
        if (showYear) {
            htmlResult += `
                            <span class="year">${outYearStr}</span>
                `;
        }
        htmlResult += `
                        </div>
                    </div>
                    <div class="eventDescription">
                        <div class="title"><a href="${event.link}">${event.title}</a></div>
            `;
        if (hasTime){
            htmlResult += `
                        <div class="time">${outTimeStr}</div>
                `;
        }
        htmlResult += `
                        <div class="description"><span>${removeTags(event.description)}</span></div>
                        <div class="read-more"><a href="${event.link}">Read more ≫</a></div>
                    </div>
                </div>
            `;
    }
    htmlResult += '</div></div>';
    return htmlResult;
}

/**
 * Determines if an event falls within a specified date range.
 *
 * @param {string | null} eventStart - The start date of the event in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM).
 * @param {string | null} eventEnd - The end date of the event in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM).
 * @param {string | null} [beginDateRange=null] - The start date of the date range.
 * @param {string | null} [endDateRange=null] - The end date of the date range.
 * @return {boolean} - Returns true if the event falls within or overlaps with the specified date range.
 */
function eventWithinDateRange(eventStart: string | null, eventEnd: string | null,
                              beginDateRange: string | null = null, endDateRange: string | null = null): boolean {
    if (eventStart === null || eventEnd === null){
        const errorMsg: string = "Event start or end is null";
        console.error(errorMsg);
        console.trace({eventStart, eventEnd});
        LogError(errorMsg);
        return false;  // This should never happen
    }

    let eventStartStr: string = eventStart;
    if (eventStart.indexOf('T') === -1) eventStartStr += "T00:00";
    const eventStartNum: number = Date.parse(eventStartStr);

    let eventEndStr: string = eventEnd;
    if (eventEnd.indexOf('T') === -1) eventEndStr += "T23:59";
    const eventEndNum: number = Date.parse(eventEndStr);

    const beginDateRangeNum: number = beginDateRange !== null ? Date.parse(beginDateRange) : Number.MIN_SAFE_INTEGER;
    const endDateRangeNum: number = endDateRange !== null ? Date.parse(endDateRange) : Number.MAX_SAFE_INTEGER;

    return eventStartNum <= endDateRangeNum && beginDateRangeNum <= eventEndNum;
}

/**
 * Removes HTML tags from the given input string and returns the cleaned text.
 * It replaces tags with a single space, collapses multiple spaces into one,
 * and trims leading and trailing spaces.
 *
 * @param {string | null | undefined} html - The HTML content to be processed.
 * If null or undefined is passed, it returns an empty string.
 *
 * @return {string} The cleaned text without HTML tags.
 */
function removeTags(html: string | null | undefined): string {
    if (html === null || html === undefined) return "";
    let retHtml: string = html.replace(/<[\s\S]+?>/g, " ");
    retHtml = retHtml.replace(/  +/g, " ");
    retHtml = retHtml.trim();
    return retHtml;
}

/**
 * Represents an event in a calendar with various attributes for defining
 * the event's timeframe and additional information.
 *
 * @interface CalendarEvent
 *
 * @property {string | null} start - The start date and time of the calendar event in ISO 8601 format or null if not specified.
 *
 * @property {string | null} end - The end date and time of the calendar event in ISO 8601 format or null if not specified.
 *
 * @property {string | null | undefined} title - The title of the calendar event; can be null or undefined if not specified.
 *
 * @property {string | null | undefined} description - A description or details about the calendar event; can be null or undefined if not specified.
 *
 * @property {string | null | undefined} link - A URL link associated with the calendar event for additional information or resources; can be null or undefined if not specified.
 */
interface CalendarEvent {
    start: string | null;
    end: string | null;
    title: string | null | undefined;
    description: string | null | undefined;
    link: string | null | undefined;
}

/**
 * Interface representing data attributes for on the RSS element.
 */
interface DataAttr {
    begin: string | null;
    end: string | null;
    count: string | null;
    tags: string | null;
    categories: string | null;
    showYear: string | null;
}

console.debug(`${ModuleName} finished loading`);
