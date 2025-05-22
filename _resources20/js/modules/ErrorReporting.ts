/**
 * @overview Appends our BugSnag script tag to the head and awaits its loading
 */

export const ModuleName = "Error Reporting Module";
const bugSnagApiKey = "06c87bc4b00a075732f6d63db463db4e";
const bugSnagJsUrl = "https://d2wy8f7a9ursnm.cloudfront.net/v8/bugsnag.min.js";

try {
    await loadBugSnag();
    // @ts-ignore
    Bugsnag.start({ apiKey: bugSnagApiKey });
    console.debug("BugSnag loaded");
} catch (error) {
    console.error(`[${ModuleName}] ${error}`)
}

/**
 * Appends BugSnag script tag to the head and returns a promise that resolves when it is loaded
 */
function loadBugSnag() {
    return new Promise<void>((resolve, reject) => {
        const scriptEl = document.createElement("script");
        scriptEl.src = bugSnagJsUrl;
        scriptEl.onload = () => resolve();
        scriptEl.onerror = () => reject(new Error("Failed to load BugSnag"));
        document.head.appendChild(scriptEl);
    });
}

/**
 * Sends a notification to BugSnag; import to load BugSnag (if it isn't already)
 * @param {string} message - Error message to be sent
 */
export function LogError(message: string | undefined) {
    // @ts-ignore
    Bugsnag?.notify(new Error(message));
}

console.debug(`${ModuleName} finished loading`);
