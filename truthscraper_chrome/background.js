if (navigator.userAgent.indexOf("Chrome") > -1) {
	console.log("Loading Excel support scripts for Chrome");
	importScripts("polyfill.js");
	importScripts("exceljs.min.js");
} else if (navigator.userAgent.indexOf("Firefox") > -1) {
	console.log("Excel support scripts loaded from manifest");
}

let tabId;

// Handle Oauth
chrome.webNavigation.onCommitted.addListener(
	(evt) => {
		if (evt.frameId !== 0) {
			return;
		}

		let transitionType = evt.transitionType;

		if (transitionType === "form_submit") {
			chrome.tabs.update(evt.tabId, {
				url: "https://truthsocial.com/",
			});
			chrome.tabs.remove(evt.tabId);
			if (tabId) {
				chrome.tabs.sendMessage(tabId, {
					action: "accessResetDone",
				});
				chrome.tabs.update(tabId, { active: true });
			} else {
				chrome.tabs.query(
					{ active: true, currentWindow: true },
					(tabs) => {
						if (tabs && tabs.length > 0) {
							chrome.tabs.sendMessage(tabs[0].id, {
								action: "accessResetDone",
							});
							chrome.tabs.update(tabs[0].id, { active: true });
						}
					}
				);
			}
		}
	},
	{ url: [{ urlContains: "https://truthsocial.com/api/" }] }
);

chrome.webRequest.onResponseStarted.addListener(
	(details) => {
		if (details.statusCode === 429) {
			const retryAfter = details.responseHeaders.find(
				(header) => header.name.toLowerCase() === "retry-after"
			);
			if (retryAfter) {
				chrome.tabs.sendMessage(details.tabId, {
					action: "rateLimitHit",
					origin: "truthscraper background",
					retryAfter: retryAfter.value,
				});
			}
		}
	},
	{
		urls: ["https://truthsocial.com/api/*"],
	},
	["responseHeaders"]
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	tabId = sender.tab ? sender.tab.id : null;
	if (message && message.action === "getRedirectUri") {
		let redirectUri;
		const userAgent = navigator.userAgent;
		if (userAgent.indexOf("Chrome") > -1) {
			redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
		} else if (userAgent.indexOf("Firefox") > -1) {
			redirectUri = browser.identity.getRedirectURL();
		}
		sendResponse({ redirectUri: redirectUri });
		return;
	}
	if (message && message.action === "startAuth") {
		(async () => {
			try {
				const instance = message.instance || "truthsocial.com";
				let redirectUri;
				const userAgent = navigator.userAgent;
				if (userAgent.indexOf("Chrome") > -1) {
					redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
				} else if (userAgent.indexOf("Firefox") > -1) {
					redirectUri = browser.identity.getRedirectURL();
				}

				const clientId = message.clientId;

				// Start auth flow
				const authUrl = `https://${instance}/oauth/authorize?client_id=${encodeURIComponent(
					clientId
				)}&response_type=code&redirect_uri=${encodeURIComponent(
					redirectUri
				)}&scope=read`;

				chrome.identity.launchWebAuthFlow(
					{ url: authUrl, interactive: true },
					async (redirectUrl) => {
						if (chrome.runtime.lastError || !redirectUrl) {
							sendResponse({
								success: false,
								error: "auth_failed",
								detail: chrome.runtime.lastError,
							});
							return;
						}
						try {
							const urlParams = new URLSearchParams(
								new URL(redirectUrl).search
							);
							const code = urlParams.get("code");
							if (code) {
								sendResponse({ success: true, code: code });
							} else {
								sendResponse({
									success: false,
									error: "no_code",
								});
							}
						} catch (e) {
							sendResponse({
								success: false,
								error: "token_exchange_failed",
								detail: e.toString(),
							});
						}
					}
				);
			} catch (e) {
				sendResponse({
					success: false,
					error: "exception",
					detail: e.toString(),
				});
			}
		})();
		// Return true to indicate we'll respond asynchronously
		return true;
	}
	if (message && message.action === "generateXlsx") {
		const posts = message.posts || [];
		const formatTable = message.formatTable || false;
		if (posts && posts.length) {
			generateXlsx(posts, formatTable, sendResponse);
			return true;
		}
	}
	if (message && message.action === "resetAccess") {
		chrome.tabs.create({ url: message.url }, (tab) => {
			sendResponse({ success: true });
		});
		return true;
	}
});

async function generateXlsx(posts, formatTable, sendResponse) {
	let widths = [];
	Object.keys(posts[0]).forEach((key) => {
		widths.push({ key: key, widths: [] });
	});
	for (let p of posts) {
		for (let [key, value] of Object.entries(p)) {
			if (value) {
				let vString = value.toString();
				widths
					.find((w) => w.key === key)
					.widths.push(key.length, vString.length);
			}
		}
	}
	widths = widths.map((w) => {
		w.widths.sort((a, b) => b - a);
		return w.widths[0];
	});

	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("TruthSocial_scrape");
	worksheet.columns = Object.keys(posts[0]).map((key) => {
		return { header: key, key: key, width: widths.shift() };
	});

	const rows = [];
	function isDate(value) {
		const regexp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3}Z)?/;
		return regexp.test(value);
	}
	for (let p of posts) {
		if (p.content.length > 32767) {
			continue;
		}
		let row = [];
		for (let [key, value] of Object.entries(p)) {
			if (isDate(value)) {
				value = new Date(value);
			} else if (key === "url") {
				value = {
					text: value,
					hyperlink: value,
					tooltip: "Link to post",
				};
			}
			row.push(value);
		}
		rows.push(row);
	}

	if (formatTable) {
		worksheet.addTable({
			name: "TruthSocial_scrape",
			ref: "A1",
			headerRow: true,
			totalsRow: false,
			style: {
				theme: "TableStyleMedium9",
				showRowStripes: true,
			},
			columns: worksheet.columns.map((col) => ({
				name: col.header,
				filterButton: true,
			})),
			rows: rows,
		});
	} else {
		worksheet.addRows(rows);
	}
	if (posts[0].hasOwnProperty("url")) {
		const urlCol = worksheet.getColumn("url");
		if (urlCol) {
			urlCol.eachCell(function (cell) {
				if (cell.value && cell.value.hyperlink) {
					cell.style = {
						font: {
							color: { argb: "ff0000ff" },
							underline: true,
						},
					};
				}
			});
		}
	}
	const buffer = await workbook.xlsx.writeBuffer();
	const binaryBlob = btoa(String.fromCharCode(...new Uint8Array(buffer)));
	const url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${binaryBlob}`;
	sendResponse({ success: true, url: url });
}
