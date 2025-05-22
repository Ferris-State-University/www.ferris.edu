/**
 * @overview This module creates a link element for CSS and appends it to the head
 */

export const ModuleName = "Event Listing via RSS CSS Appending Module";

const element: HTMLLinkElement = document.createElement("link");
element.rel = "stylesheet";
element.href = "https://www.ferris.edu/_resources20/css/EventListingViaRss.css";
document.head.appendChild(element);

console.debug(`${ModuleName} finished loading`);