if (navigator.userAgent.indexOf('Chrome') > -1) {
	importScripts('polyfill.js');
	importScripts('exceljs.min.js');
}

let tabId;

const manifest = chrome.runtime.getManifest();
const origins = manifest.host_permissions;
async function checkPermissions() {
	return new Promise(async (resolve) => {
		const hasPermissions = await chrome.permissions.contains({ origins });
		if (!hasPermissions) {
			resolve(false);
		} else {
			resolve(true);
		}
	});
}
chrome.action.onClicked.addListener(async (tab) => {
	const granted = await chrome.permissions.request({ origins });
	if (granted) {
		if (tab.url.includes('truthsocial.com')) {
			if (tab.url !== 'https://truthsocial.com/') {
				chrome.scripting.executeScript({
					target: { tabId: tab.id },
					func: () => {
						window.alert(
							'You will be redirected to the home page to start the scraping process.',
						);
						if (
							window.location.href !== 'https://truthsocial.com/'
						) {
							window.location.href = 'https://truthsocial.com/';
						}
					},
				});
			} else {
				chrome.tabs.query(
					{ active: true, currentWindow: true },
					function (tabs) {
						chrome.tabs.sendMessage(
							tab.id,
							{ action: 'checkScraperStatus' },
							(response) => {
								if (response) {
									chrome.tabs.sendMessage(
										tab.id,
										{ action: 'checkOpenDialog' },
										(dialogResponse) => {
											if (
												dialogResponse &&
												!dialogResponse.open
											) {
												chrome.tabs.sendMessage(
													tabs[0].id,
													{
														action: 'start_truthscraper',
													},
												);
											}
										},
									);
								} else if (!response) {
									document.getElementById(
										'reload-container',
									).style.display = 'block';
								}
							},
						);
					},
				);
			}
		} else {
			chrome.tabs.create({
				url: 'https://truthsocial.com/',
			});
		}
	}
});

// Handle Oauth
chrome.webNavigation.onCommitted.addListener(
	(evt) => {
		if (evt.frameId !== 0) {
			return;
		}

		let transitionType = evt.transitionType;

		if (transitionType === 'form_submit') {
			chrome.tabs.update(evt.tabId, {
				url: 'https://truthsocial.com/',
			});
			chrome.tabs.remove(evt.tabId);
			if (tabId) {
				chrome.tabs.sendMessage(tabId, {
					action: 'accessResetDone',
				});
				chrome.tabs.update(tabId, { active: true });
			} else {
				chrome.tabs.query(
					{ active: true, currentWindow: true },
					(tabs) => {
						if (tabs && tabs.length > 0) {
							chrome.tabs.sendMessage(tabs[0].id, {
								action: 'accessResetDone',
							});
							chrome.tabs.update(tabs[0].id, { active: true });
						}
					},
				);
			}
			resetting = false;
		}
	},
	{ url: [{ urlContains: 'https://truthsocial.com/api/' }] },
);

let forbidden = false;
let resetting = false;
chrome.webRequest.onResponseStarted.addListener(
	(details) => {
		if (details.statusCode === 429) {
			const retryAfter = details.responseHeaders.find(
				(header) => header.name.toLowerCase() === 'retry-after',
			);
			if (retryAfter) {
				chrome.tabs.sendMessage(details.tabId, {
					action: 'rateLimitHit',
					origin: 'truthscraper background',
					retryAfter: retryAfter.value,
				});
			}
		}
		if (details.statusCode === 403 || details.statusCode === 401) {
			forbidden = true;
			resetAccess(details.url);
			return;
		}
		if (details.statusCode === 200) {
			forbidden = false;
			return;
		}
	},
	{
		urls: ['https://truthsocial.com/api/*'],
	},
	['responseHeaders'],
);

async function resetAccess(url) {
	if (resetting) {
		return;
	}
	resetting = true;
	await new Promise((resolve) => {
		chrome.tabs.create({ url: url }, (tab) => {
			resolve();
		});
	});
}

let token = null;
chrome.webRequest.onBeforeSendHeaders.addListener(
	(details) => {
		const authHeader = details.requestHeaders.find(
			(header) => header.name.toLowerCase() === 'authorization',
		);
		if (authHeader) {
			token = authHeader.value.replace('Bearer ', '');
		}
	},
	{
		urls: ['https://truthsocial.com/api/*'],
	},
	['requestHeaders'],
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	tabId = sender.tab ? sender.tab.id : null;
	if (message && message.action === 'sendToken') {
		sendResponse({ success: true, token: token });
		return;
	}
	if (message && message.action === 'checkForbidden') {
		sendResponse({ forbidden: forbidden });
		return;
	}
	if (message && message.action === 'getRedirectUri') {
		let redirectUri;
		const userAgent = navigator.userAgent;
		if (userAgent.indexOf('Chrome') > -1) {
			redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
		} else if (userAgent.indexOf('Firefox') > -1) {
			redirectUri = browser.identity.getRedirectURL();
		}
		sendResponse({ redirectUri: redirectUri });
		return;
	}
	if (message && message.action === 'generateXlsx') {
		const posts = message.posts || [];
		const formatTable = message.formatTable || false;
		if (posts && posts.length) {
			generateXlsx(posts, formatTable, sendResponse);
			return true;
		}
	}
	if (message && message.action === 'resetAccess') {
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
	const worksheet = workbook.addWorksheet('TruthSocial_scrape');
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
			} else if (key === 'url') {
				value = {
					text: value,
					hyperlink: value,
					tooltip: 'Link to post',
				};
			}
			row.push(value);
		}
		rows.push(row);
	}

	if (formatTable) {
		worksheet.addTable({
			name: 'TruthSocial_scrape',
			ref: 'A1',
			headerRow: true,
			totalsRow: false,
			style: {
				theme: 'TableStyleMedium9',
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
	worksheet.columns.forEach((column) => {
		let maxLength = 10;
		column.eachCell({ includeEmpty: true }, (cell) => {
			cell.alignment = {
				wrapText: true,
				vertical: 'top',
				shrinkToFit: true,
			};
			if (cell.value && cell.value.hyperlink) {
				cell.style = {
					font: {
						size: 12,
						color: { argb: 'ff0000ff' },
						underline: true,
					},
				};
			} else {
				cell.font = { size: 12 };
			}
			let cellValue = cell.value.text || cell.value;
			if (cellValue instanceof Date) {
				cellValue = cellValue.toISOString();
			}
			let cellLength = cellValue ? cellValue.toString().length : 10;
			if (cellLength > maxLength) {
				maxLength = cellLength;
			}
		});
		if (maxLength >= 150) {
			maxLength = maxLength / 2;
		}
		column.width = maxLength;
	});
	worksheet.getRow(1).font = {
		bold: true,
		size: 12,
		color: { argb: 'FFFFFFFF' },
	};
	const buffer = await workbook.xlsx.writeBuffer();
	const binaryBlob = btoa(String.fromCharCode(...new Uint8Array(buffer)));
	const url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${binaryBlob}`;
	sendResponse({ success: true, url: url });
}
