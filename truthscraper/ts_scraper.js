console.log('TruthScraper loaded');
const checkScraperStatus = (message, sender, sendResponse) => {
	if (message.action === 'checkScraperStatus') {
		sendResponse({ status: 'active' });
	}
};
chrome.runtime.onMessage.addListener(checkScraperStatus);
const checkOpenDialog = (message, sender, sendResponse) => {
	if (message.action === 'checkOpenDialog') {
		sendResponse({
			open:
				document.querySelector('dialog.ts-scraper-dialog[open]') !==
				null,
		});
	}
};
chrome.runtime.onMessage.addListener(checkOpenDialog);
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	if (message.action === 'start_truthscraper') {
		sendResponse({ success: true });
		chrome.runtime.sendMessage({
			action: 'log',
			info: 'Starting TruthScraper dialog',
		});
		const dialog = document.createElement('dialog');
		dialog.classList.add('ts-scraper-dialog');
		const dialogHtmlUrl = chrome.runtime.getURL('ts_scraper.html');
		const dialogRes = await fetch(dialogHtmlUrl);
		if (!dialogRes.ok) {
			console.error('Failed to fetch dialog HTML');
			return;
		}
		const dialogHtml = await dialogRes.text();
		dialog.innerHTML = dialogHtml;
		document.body.appendChild(dialog);
		const authContainer = dialog.querySelector('#auth-container');
		const authFold = dialog.querySelector('#auth-fold');
		const authUnfold = dialog.querySelector('#auth-unfold');
		const instSpan = dialog.querySelector('#instructions');
		const instDiv = dialog.querySelector('#instructions-container');
		const instanceContainer = dialog.querySelector('#instance-container');
		const instanceSaveBtn = dialog.querySelector('#instance-save');
		const allDone = dialog.querySelector('#all-done');
		const resetAuthBtn = dialog.querySelector('#reset-auth');
		const searchFold = dialog.querySelector('#search-fold');
		const searchUnfold = dialog.querySelector('#search-unfold');
		const searchContainer = dialog.querySelector('#search-container');
		const verificationDiv = dialog.querySelector('#verification-div');
		const searchModeSelect = dialog.querySelector('#search-mode');
		const guidedSearchDiv = dialog.querySelector('#guided-search');
		const allWordsInput = dialog.querySelector('#all-words');
		const thisPhraseInput = dialog.querySelector('#this-phrase');
		const langDiv = dialog.querySelector('#language-div');
		const langInput = dialog.querySelector('#lang');
		const userDiv = dialog.querySelector('#user-div');
		const accountInput = dialog.querySelector('#account');
		const dateDiv = dialog.querySelector('#date-div');
		const fromDateInput = dialog.querySelector('#from-date');
		const toDateInput = dialog.querySelector('#to-date');
		const queryUrlDiv = dialog.querySelector('#queryurl-div');
		const queryUrlInput = dialog.querySelector('#queryurl-input');
		const searchBtn = dialog.querySelector('#search-btn');
		const searchMsg = dialog.querySelector('#search-msg');
		const noResult = dialog.querySelector('#no-result');
		const extractContainer = dialog.querySelector('#extract-container');
		const maxTootsDiv = dialog.querySelector('#max-toots-div');
		const maxTootsInput = dialog.querySelector('#max-toots');
		const extractBtnDiv = dialog.querySelector('#extract-btn-div');
		const extractBtn = dialog.querySelector('#extract-btn');
		const extractSpinner = dialog.querySelector('#extract-spinner');
		const queryUrlDisplay = dialog.querySelector('#queryurl');
		const abortBtn = dialog.querySelector('#abort-btn');
		const resultsContainer = dialog.querySelector('#results-container');
		const resultsMsg = dialog.querySelector('#results-msg');
		const resetBtn = dialog.querySelector('#reset-btn');
		const dlResult = dialog.querySelector('#dl-result');
		const notice = dialog.querySelector('#notice');
		const dismissBtn = dialog.querySelector('#dismiss');
		const dlDialog = dialog.querySelector('#dl-dialog');
		const anonymizeCheckbox = dialog.querySelector('input#anonymize');
		const formatSelect = dialog.querySelector('#format-select');
		const dlConfirmBtn = dialog.querySelector('#dl-confirm-btn');

		const closeBtn = dialog.querySelector('.close-btn');
		closeBtn.addEventListener('click', () => {
			dialog.close();
			dialog.remove();
		});

		const version = chrome.runtime.getManifest().version;
		dialog.querySelector('#version-div').textContent = 'v' + version;

		const logoUrl = chrome.runtime.getURL('icons/truth-logo.svg');
		dialog.querySelector('.ts-logo img').src = logoUrl;

		// Declare credentials
		let tsInstance = 'truthsocial.com';
		let clientId;
		let clientSecret;
		chrome.storage.local.get(['tsclientid', 'tsclientsecret'], (result) => {
			clientId = result.tsclientid;
			clientSecret = result.tsclientsecret;
		});

		// Manage notice
		let understand;
		let userToken;

		//Functions to handle user token
		async function getUserCreds() {
			await new Promise(async (resolve) => {
				const userCreds = await chrome.storage.local.get(
					['tsusertoken', 'tsclientid', 'tsclientsecret'],
					(result) => {
						if (
							result.tsusertoken &&
							result.tsclientid &&
							result.tsclientsecret
						) {
							userToken = result.tsusertoken;
							clientId = result.tsclientid;
							clientSecret = result.tsclientsecret;
							resolve();
						} else {
							const authData = localStorage.getItem('truth:auth');
							const authObj = JSON.parse(authData);
							const tokens = authObj.tokens;
							const users = authObj.users;
							const me = authObj.me;
							if (me && tokens && users) {
								userToken = users[me].access_token;
								chrome.storage.local.set({
									tsusertoken: userToken,
								});
								if (userToken) {
									clientId = tokens[userToken].client_id;
									clientSecret =
										tokens[userToken].client_secret;
									chrome.storage.local.set({
										tsclientid: clientId,
										tsclientsecret: clientSecret,
									});
									resolve();
								}
							} else {
								chrome.runtime.sendMessage(
									{ action: 'sendCreds' },
									async (response) => {
										if (response && response.success) {
											userToken = response.creds.token;
											clientId = response.creds.clientId;
											clientSecret =
												response.creds.clientSecret;
											chrome.storage.local.set({
												tsusertoken: userToken,
												tsclientid: clientId,
												tsclientsecret: clientSecret,
											});
											resolve();
										} else {
											userToken = null;
											window.alert(
												'You need to be logged into your Truth Social account.',
											);
											resolve();
										}
									},
								);
							}
						}
					},
				);
				// }
			});

			if (userToken && clientId && clientSecret) {
				instSpan.style.display = 'none';
				instDiv.style.display = 'none';
				instanceContainer.style.display = 'none';
				allDone.style.display = 'block';
				searchFold.style.display = 'block';
				searchUnfold.style.display = 'none';
				verificationDiv.style.display = 'block';
				verificationDiv.style.display = 'none';
				searchContainer.style.display = 'block';
				dialog.showModal();
				allWordsInput.focus();
			} else if (userToken && (!clientId || !clientSecret)) {
				window.alert('Please log in to your Truth Social account.');
				chrome.runtime.sendMessage(
					{ action: 'removeToken' },
					(response) => {
						if (response && response.success) {
							userToken = null;
							clientId = null;
							clientSecret = null;
							localStorage.clear();
							sessionStorage.clear();
							location.reload();
						}
					},
				);
			} else {
				// closeBtn.click();
				const loginBtn = document.querySelector(
					'button[data-testid="button"]',
				);
				if (
					loginBtn &&
					loginBtn.textContent.toLowerCase() === 'sign in'
				) {
					loginBtn.click();
				}
			}
		}

		await getUserCreds();

		async function saveUserToken() {
			chrome.storage.local.set(
				{
					tsusertoken: userToken,
					tsclientid: clientId,
					tsclientsecret: clientSecret,
				},
				function () {
					allDone.style.display = 'block';
					instSpan.style.display = 'none';
					instDiv.style.display = 'none';
					instanceContainer.style.display = 'none';
					setTimeout(() => {
						authContainer.style.display = 'none';
						authFold.style.display = 'none';
						authUnfold.style.display = 'block';
						searchContainer.style.display = 'block';
						searchFold.style.display = 'block';
						searchUnfold.style.display = 'none';
					}, 1000);
				},
			);
		}

		async function removeUserToken() {
			return new Promise(async (resolve) => {
				const body = {
					client_id: clientId,
					client_secret: clientSecret,
					token: userToken,
				};
				const revokeUrl = 'https://truthsocial.com/oauth/revoke';
				try {
					const response = await fetch(revokeUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(body),
					});
					if (response.ok) {
						chrome.runtime.sendMessage(
							{ action: 'removeToken' },
							async (response) => {
								if (response && response.success) {
									// window.alert(
									// 	'You have successfully logged out.',
									// );
									userToken = null;
									clientId = null;
									clientSecret = null;
									localStorage.clear();
									sessionStorage.clear();
									// location.reload();
									resolve(true);
								} else {
									window.alert(
										'Error resetting authentication',
									);
									resolve(false);
								}
							},
						);
						// resolve(true);
					} else {
						resolve(false);
					}
				} catch (error) {
					console.error('Error revoking token:', error);
					resolve(false);
				}
			});
		}

		// Functions to handle notice
		getUnderstand(function (understandResult) {
			understand = understandResult;
			if (userToken && understand) {
				notice.style.display = 'none';
			} else {
				notice.style.display = 'block';
			}
		});

		function getUnderstand(callback) {
			chrome.storage.local.get(['understand'], function (result) {
				const understand = result.understand || '';
				callback(understand);
			});
		}

		async function saveUnderstand() {
			chrome.storage.local.set({ understand: 'understand' }, function () {
				notice.style.display = 'none';
			});
		}

		dismissBtn.addEventListener('click', () => {
			saveUnderstand();
		});

		function checkForbidden() {
			chrome.runtime.sendMessage(
				{ action: 'checkForbidden' },
				(response) => {
					if (response && response.forbidden) {
						window.alert(
							'You have been temporarily blocked. You will be redirected to regain access.',
						);
						chrome.runtime.sendMessage(
							{
								action: 'resetAccess',
								url: window.location.href,
							},
							(response) => {
								if (response && response.success) {
									window.reload();
								}
							},
						);
					}
				},
			);
		}

		checkForbidden();

		// Assign role to Authentication header
		authFold.addEventListener('click', () => {
			if (authContainer.style.display === 'block') {
				authContainer.style.display = 'none';
				authFold.style.display = 'none';
				authUnfold.style.display = 'block';
			}
		});

		authUnfold.addEventListener('click', () => {
			if (authContainer.style.display === 'none') {
				authContainer.style.display = 'block';
				authFold.style.display = 'block';
				authUnfold.style.display = 'none';
			}
		});

		// Assign role to Instructions header
		instSpan.addEventListener('click', () => {
			if (instDiv.style.display === 'none') {
				instDiv.style.display = 'block';
				instSpan.textContent = 'Hide instructions';
			} else if (instDiv.style.display === 'block') {
				instDiv.style.display = 'none';
				instSpan.textContent = 'Show instructions';
			}
		});

		// Assign role to 'Build search query' header
		searchFold.addEventListener('click', () => {
			searchContainer.style.display = 'none';
			searchFold.style.display = 'none';
			searchUnfold.style.display = 'block';
		});

		searchUnfold.addEventListener('click', () => {
			searchContainer.style.display = 'block';
			searchFold.style.display = 'block';
			searchUnfold.style.display = 'none';
		});

		instanceSaveBtn.addEventListener('click', () => {
			chrome.runtime.sendMessage({ action: 'sendCreds' }, (response) => {
				if (response && response.success && response.creds) {
					userToken = response.creds.token;
					clientId = response.creds.clientId;
					clientSecret = response.creds.clientSecret;
					saveUserToken();
				} else {
					closeBtn.click();
					const loginBtn = document.querySelector(
						'button[data-testid="button"]',
					);
					if (
						loginBtn &&
						loginBtn.textContent.toLowerCase() === 'sign in'
					) {
						loginBtn.click();
					}
				}
			});
		});

		// Reset authentication button
		resetAuthBtn.addEventListener('click', async () => {
			const revoke = await removeUserToken();
			if (!revoke) {
				window.alert('Error resetting authentication');
				return;
			} else {
				window.alert('You have successfully logged out.');
				location.reload();
			}
		});

		// Logic to build query URL from inputs
		let queryUrl;
		let lang;
		accountInput.addEventListener('change', () => {
			accountInput.removeAttribute('style');
		});

		let fromDate;
		let min_id;
		fromDateInput.addEventListener('change', () => {
			fromDate = new Date(fromDateInput.value);
			const fromDateStamp = BigInt(fromDate.getTime() / 1000);
			min_id = (fromDateStamp << 16n) * 1000n;
		});

		let toDate;
		let max_id;
		toDateInput.addEventListener('change', () => {
			toDate = new Date(toDateInput.value);
			const toDateStamp = BigInt(toDate.getTime() / 1000);
			max_id = (toDateStamp << 16n) * 1000n;
		});

		let searchMode = 'guided';

		searchModeSelect.addEventListener('change', () => {
			searchMode = searchModeSelect.value;
			if (searchMode === 'guided') {
				guidedSearchDiv.style.display = 'block';
				langDiv.style.display = 'block';
				userDiv.style.display = 'none';
				dateDiv.style.display = 'block';
				queryUrlDiv.style.display = 'none';
				allWordsInput.focus();
			} else if (searchMode === 'user') {
				guidedSearchDiv.style.display = 'none';
				langDiv.style.display = 'none';
				userDiv.style.display = 'block';
				dateDiv.style.display = 'block';
				queryUrlDiv.style.display = 'none';
				accountInput.focus();
			} else if (searchMode === 'url') {
				guidedSearchDiv.style.display = 'none';
				langDiv.style.display = 'none';
				userDiv.style.display = 'none';
				dateDiv.style.display = 'none';
				queryUrlDiv.style.display = 'block';
				queryUrlInput.focus();
			}
		});

		let queryAttempt = 0;
		async function buildQueryUrl() {
			queryAttempt += 1;
			queryUrl =
				'https://' + tsInstance + '/api/v2/search?limit=20&offset=0';

			// Concatenate query URL from search elements
			let allWords = allWordsInput.value.replaceAll(' ', ' AND ');
			let thisPhrase = thisPhraseInput.value;
			lang = langInput.value;
			let account = accountInput.value.replaceAll(' ', ' AND ');
			if (fromDate) {
			}
			if (allWords || thisPhrase) {
				queryUrl = queryUrl + '&q=';
			}
			if (allWords) {
				queryUrl = queryUrl + `${allWords}`;
			}
			if (thisPhrase) {
				if (allWords) {
					queryUrl = queryUrl + ' AND ';
				}
				queryUrl = queryUrl + '"' + thisPhrase + '"';
			}
			if (searchMode === 'user' && account) {
				try {
					getIdUrl =
						'https://' +
						tsInstance +
						'/api/v1/accounts/lookup?acct=' +
						account;
					const idResponse = await fetch(getIdUrl);
					if (idResponse.ok) {
						const idData = await idResponse.json();
						account = idData.id;
					} else {
						if (idResponse.status === 403) {
							if (
								window.confirm(
									'You have been temporarily blocked: click OK to reset your access and try again',
								)
							) {
								chrome.runtime.sendMessage(
									{
										action: 'resetAccess',
										url: queryUrl,
									},
									(response) => {
										if (response && response.success) {
											const accessResetListener2 = (
												message,
												sender,
												sendResponse,
											) => {
												if (
													message.action ===
													'accessResetDone'
												) {
													chrome.runtime.onMessage.removeListener(
														accessResetListener2,
													);
													buildQueryUrl();
													return;
												}
											};
											chrome.runtime.onMessage.addListener(
												accessResetListener2,
											);
										} else {
											console.error(
												'Failed to reset access',
											);
											return;
										}
									},
								);
							}
						}
						window.alert('Account not found');
						searchMsg.style.display = 'none';
						accountInput.style.outline = 'solid 2px #e60000';
						accountInput.style.border = 'solid 1px #e60000';
						accountInput.focus();
						return;
					}
					if (allWords || thisPhrase) {
						queryUrl = queryUrl + '&';
					}
					queryUrl = queryUrl + 'account_id=' + account;
				} catch (error) {
					console.error(error);
				}
			}
			if (searchMode === 'user') {
				const excludeReplies =
					dialog.querySelector('#exclude-replies').checked;
				const excludeReposts =
					dialog.querySelector('#exclude-reposts').checked;
				queryUrl = `https://truthsocial.com/api/v1/accounts/${account}/statuses?exclude_replies=${excludeReplies}&exclude_reblogs=${excludeReposts}&limit=20`;
			} else if (searchMode === 'guided' || searchMode === 'expert') {
				queryUrl = queryUrl + '&resolve=true&type=statuses';
			}
			if (searchMode !== 'url') {
				if (fromDate) {
					if (searchMode === 'user') {
						queryUrl += '&since_id=' + min_id;
					} else if (searchMode !== 'user') {
						if (allWords || thisPhrase) {
							queryUrl = queryUrl + '&';
						}
						queryUrl = queryUrl + 'min_id=' + min_id;
					}
				}
				if (toDate) {
					if (searchMode === 'user' || allWords || thisPhrase) {
						queryUrl = queryUrl + '&';
					}
					queryUrl = queryUrl + 'max_id=' + max_id;
				}
			}
			if (searchMode === 'url' && queryUrlInput.value) {
				queryUrl = queryUrlInput.value;
			}
			queryUrl = encodeURI(queryUrl);
			const queryLink = document.createElement('a');
			queryLink.setAttribute('href', queryUrl);
			queryLink.setAttribute('target', '_blank');
			queryLink.textContent = queryUrl;
			queryLink.style.fontWeight = 'normal';
			queryUrlDisplay.textContent = 'Query URL: ';
			queryUrlDisplay.appendChild(queryLink);

			// Fetch query response from server
			try {
				if (
					searchMode !== 'user' &&
					!allWords &&
					!thisPhrase &&
					!queryUrlInput.value
				) {
					window.alert('Please provide keywords or a query URL');
					searchMsg.style.display = 'none';
					return;
				} else if (searchMode === 'user' && !account) {
					window.alert('Please provide a username');
					accountInput.focus();
					return;
				}
				const response = await fetch(queryUrl, {
					headers: {
						Authorization: `Bearer ${userToken}`,
						scope: 'read',
					},
				});
				if (response.status === 401) {
					searchMsg.style.display = 'none';
					window.alert(
						'Application not authorized: please log into Truth Social',
					);
					const revoked = removeUserToken();
					if (revoked) {
						location.reload();
					} else {
						authContainer.style.display = 'block';
						authFold.style.display = 'block';
						authUnfold.style.display = 'none';
					}
					throw new Error('User needs to authorize app');
				} else if (response.status === 403) {
					const accessResetListener3 = (
						message,
						sender,
						sendResponse,
					) => {
						if (message.action === 'accessResetDone') {
							chrome.runtime.onMessage.removeListener(
								accessResetListener3,
							);
							buildQueryUrl();
							return;
						}
					};
					chrome.runtime.onMessage.addListener(accessResetListener3);
				} else if (response.status === 429) {
					const rateLimitListener = (
						message,
						sender,
						sendResponse,
					) => {
						if (message.action === 'rateLimitHit') {
							chrome.runtime.onMessage.removeListener(
								rateLimitListener,
							);
							let retryAfter = Number(message.retryAfter);
							if (retryAfter === 0) {
								window.alert(
									'You have been blocked: try again later.',
								);
								searchMsg.textContent = '';
								return;
							} else {
								searchMsg.textContent = `Waiting for rate limit to lift... ${retryAfter} seconds remaining`;
								const interval = setInterval(() => {
									searchMsg.textContent = `Waiting for rate limit to lift... ${retryAfter} seconds remaining`;
									retryAfter--;
									if (retryAfter < 0) {
										clearInterval(interval);
										buildQueryUrl();
									}
								}, 1000);
								closeBtn.onclick = () => {
									clearInterval(interval);
									dialog.close();
									dialog.remove();
									return;
								};
							}
						}
					};
					chrome.runtime.onMessage.addListener(rateLimitListener);
				} else if (!response || !response.ok) {
					window.alert(
						`Error fetching query URL: status ${response.status}`,
					);
					searchMsg.style.display = 'none';
					throw new Error('Could not fetch search results.');
				} else {
					const searchData = await response.json();
					let searchResults = searchData.statuses
						? searchData.statuses
						: searchData;
					if (searchResults.length == 0) {
						searchMsg.style.display = 'none';
						noResult.style.display = 'block';
					} else {
						searchMsg.style.display = 'none';
						searchContainer.style.display = 'none';
						searchFold.style.display = 'none';
						searchUnfold.style.display = 'block';
						extractContainer.style.display = 'block';
						extractBtn.style.display = 'block';
					}
				}
			} catch (error) {
				console.error(error);
			}
		}

		// Assign role to search button
		searchBtn.addEventListener('click', () => {
			extractContainer.style.display = 'none';
			resultsContainer.style.display = 'none';
			maxTootsDiv.style.display = 'block';
			searchMsg.style.display = 'block';
			noResult.style.display = 'none';
			buildQueryUrl();
		});

		// Declare extraction variables
		let maxToots;
		maxTootsInput.addEventListener('change', () => {
			maxToots = maxTootsInput.value;
			if (!maxToots) {
				maxToots = Infinity;
			}
		});

		let statuses = [];
		let posts = [];
		let id;
		let skippedItems = 0;
		let nextQueryUrl;

		// Assign function to extract button
		extractBtn.addEventListener('click', () => {
			if (statuses.length || posts.length) {
				showOptions(statuses);
				return;
			}
			triggerScrape();
		});

		async function triggerScrape() {
			maxTootsDiv.style.display = 'none';
			maxTootsInput.disabled = true;
			abortBtn.style.display = 'block';
			extractBtn.style.display = 'none';
			resultsContainer.style.display = 'block';
			resultsMsg.textContent = '';
			dlResult.textContent = '';
			resetBtn.style.display = 'none';
			try {
				await scrape();
				abortBtn.style.display = 'none';
				extractBtn.style.display = 'block';
				maxTootsInput.disabled = false;
				extractBtn.disabled = false;
				extractSpinner.style.display = 'none';
				resultsMsg.textContent = statuses.length + ' post(s) extracted';
				showOptions(statuses);
				resetBtn.style.display = 'inline-block';
			} catch (error) {
				console.error('Error: ', error);
			}
		}

		// Assign function to abort button
		abortBtn.addEventListener('click', () => {
			abortBtn.textContent = 'Aborting...';
			abort = true;
		});
		// Function to scrape toots
		let attempt = 0;
		let downloaded = false;
		async function scrape() {
			let tootSet = new Set();
			abort = false;
			extractBtn.style.display = 'none';
			abortBtn.style.display = 'block';
			if (!maxToots) {
				maxToots = Infinity;
			}

			let p = 1;

			let offset = 0;
			skippedItems = 0;

			let excludeReblogs =
				dialog.querySelector('#exclude-reposts').checked;
			let excludeReplies =
				dialog.querySelector('#exclude-replies').checked;

			while (statuses.length < maxToots) {
				const requestTime = Date.now();
				const result = await processPage();
				if (!result) {
					break;
				}
				if (statuses.length >= maxToots || abort) {
					abortBtn.textContent = 'Abort';
					abortBtn.style.display = 'none';
					extractBtn.style.display = 'block';
					extractBtn.disabled = true;
					abort = false;
					break;
				}
				const resultTime = Date.now();
				await new Promise((resolve) =>
					setTimeout(
						resolve,
						Math.max(0, 1000 - (resultTime - requestTime)),
					),
				);
			}

			async function processPage() {
				attempt += 1;
				try {
					if (maxToots) {
						maxToots = Number(maxToots);
					}
					if (p === 1) {
						nextQueryUrl = queryUrl;
					} else if (p > 1) {
						nextQueryUrl = new URL(queryUrl);
						if (
							searchMode === 'user' ||
							nextQueryUrl.pathname.includes('/api/v1/accounts/')
						) {
							nextQueryUrl.searchParams.set(
								'max_id',
								id.toString(),
							);
						} else {
							nextQueryUrl.searchParams.set(
								'offset',
								offset.toString(),
							);
						}
						nextQueryUrl = nextQueryUrl.toString();
					}
					nextQueryUrl = nextQueryUrl;
					while (true) {
						if (abort) return false;
						const response = await fetch(nextQueryUrl, {
							headers: {
								Authorization: `Bearer ${userToken}`,
								scope: 'read',
							},
						});
						if (response.status === 401) {
							window.alert(
								'Application not authorized: please authenticate with Truth Social',
							);
							abort = true;
							throw new Error(
								'Could not fetch: not authenticated',
							);
						} else if (response.status === 403) {
							const ok = await new Promise((resolve) => {
								const accessResetListener4 = (
									message,
									sender,
									sendResponse,
								) => {
									if (message.action === 'accessResetDone') {
										chrome.runtime.onMessage.removeListener(
											accessResetListener4,
										);
										resolve(true);
									}
								};
								chrome.runtime.onMessage.addListener(
									accessResetListener4,
								);
							});
							if (!ok) {
								abort = true;
								return false;
							} else {
								continue;
							}
						} else if (response.status === 429) {
							const retryAfter = await new Promise((resolve) => {
								const listener = (message) => {
									if (
										message &&
										message.action === 'rateLimitHit'
									) {
										chrome.runtime.onMessage.removeListener(
											listener,
										);
										resolve(Number(message.retryAfter));
									}
								};
								chrome.runtime.onMessage.addListener(listener);
							});
							if (!retryAfter || Number(retryAfter) === 0) {
								window.alert(
									'You have been temporarily blocked: download the data, copy the query URL and paste it into the relevant field to resume later.',
								);
								resultsMsg.textContent = '';
								queryUrlDisplay.textContent =
									'Click here to copy query URL';
								queryUrlDisplay.style.cursor = 'pointer';
								queryUrlDisplay.style.textDecoration =
									'underline';
								queryUrlDisplay.style.fontWeight = 'bold';
								queryUrlDisplay.onclick = () => {
									navigator.clipboard.writeText(nextQueryUrl);
									queryUrlDisplay.textContent =
										'Query URL copied to clipboard!';
									if (downloaded) {
										setTimeout(() => {
											queryUrlDisplay.removeAttribute(
												'style',
											);
											searchUnfold.click();
											searchModeSelect.focus();
											searchModeSelect.value = 'url';
											searchModeSelect.dispatchEvent(
												new Event('change'),
											);
											queryUrlInput.value = nextQueryUrl;
											extractContainer.style.display =
												'none';
											resultsContainer.style.display =
												'none';
											statuses = [];
											posts = [];
											downloaded = false;
										}, 1000);
									}
								};
								abort = true;
								return false;
							}
							let seconds = Number(retryAfter);
							resultsMsg.textContent = `Waiting for rate limit to lift... ${seconds} seconds remaining`;
							await new Promise((resolve) => {
								const interval = setInterval(() => {
									if (abort) {
										clearInterval(interval);
										resolve();
										return;
									}
									seconds--;
									resultsMsg.textContent = `Waiting for rate limit to lift... ${seconds} seconds remaining`;
									if (seconds < 0) {
										clearInterval(interval);
										resolve();
									}
								}, 1000);
							});
							continue;
						} else if (!response.ok) {
							window.alert(
								`Error fetching results: HTTP error ${response.status}`,
							);
							abort = true;
							throw new Error(
								'HTTP error, could not fetch search results',
							);
						} else {
							const data = await response.json();
							const results = data.statuses
								? data.statuses
								: data;
							offset += results.length;
							if (
								!results.length ||
								(offset > 1 && results.length <= 1)
							) {
								window.alert('No more results to fetch.');
								abort = true;
							}
							for (let s of results) {
								if (statuses.length >= maxToots) {
									abort = true;
									break;
								}
								id = s.id;
								if (tootSet.has(s.id)) {
									continue;
								}
								tootSet.add(s.id);
								if (searchMode === 'user') {
									if (
										(excludeReblogs ||
											nextQueryUrl.includes(
												'exclude_reblogs',
											)) &&
										s.reblog
									) {
										continue;
									}
									if (
										(excludeReplies ||
											nextQueryUrl.includes(
												'exclude_replies',
											)) &&
										s.in_reply_to_id
									) {
										continue;
									}
								}
								const parser = new DOMParser();
								if (lang && s.language !== lang) {
									continue;
								}
								if (
									fromDate &&
									s.created_at < fromDate.toISOString()
								) {
									abort = true;
									break;
								}
								if (
									toDate &&
									s.created_at > toDate.toISOString()
								) {
									continue;
								}
								if (s.content === '<p></p>') {
									skippedItems++;
									continue;
								}
								let rawText = s.content;
								let rawTextHtml = parser.parseFromString(
									rawText,
									'text/html',
								);
								let rawTextElements = Array.from(
									rawTextHtml.body.querySelector('p')
										.childNodes,
								).map((node) => node.textContent);
								let rawTextParsed = rawTextElements.join(' ');
								let rawTextString = rawTextParsed
									.replaceAll(/\s[,.;:!?]/gu, (match) =>
										match.trim(),
									)
									.replaceAll(/\s+/gu, ' ')
									.replaceAll('&nbsp;', ' ')
									.replaceAll('<br>', '\n')
									.replaceAll('<p>', '\n')
									.replaceAll(/<.+?>/gu, '');
								s.content = rawTextString.normalize('NFC');
								if (!s.content || s.content.trim() === '') {
									skippedItems++;
									continue;
								}
								statuses.push(s);
								if (maxToots !== Infinity) {
									resultsMsg.textContent = `${statuses.length} out of ${maxToots} extracted...`;
								} else {
									resultsMsg.textContent = `${statuses.length} post(s) extracted...`;
								}
								if (statuses.length > maxToots) {
									return;
								}
							}
							p++;
							return true;
						}
					}
				} catch (error) {
					console.error(error);
				}
			}
		}

		// Show data options dialog
		function getCheckedMetadata() {
			return new Promise((resolve) => {
				chrome.storage.local.get('tsCheckedMetadata', (results) => {
					resolve(results.tsCheckedMetadata || []);
				});
			});
		}

		let checkedMetadata = await getCheckedMetadata();

		async function showOptions(statuses) {
			const keyTree = await buildKeyTree(statuses);
			const container = dlDialog.querySelector('#keys-container');
			container.textContent = '';
			generateListTree(keyTree, container);
			const checkboxes = dlDialog.querySelectorAll(
				'input[type="checkbox"].data-item',
			);
			checkboxes.forEach((checkbox) => {
				updateParentCheckboxes(checkbox);
				if (checkbox.checked || checkbox.indeterminate) {
					const div = checkbox.closest('div.nested-container');
					if (div) {
						div.style.height = 'auto';
						const arrow = div
							.closest('li')
							.querySelector('span.arrow');
						if (arrow) {
							arrow.textContent = '[less]';
						}
					}
				}
			});
			const postCountSpan = dlDialog.querySelector('#post-count');
			postCountSpan.textContent = `${statuses.length} post(s) extracted.`;
			const closeBtn = dlDialog.querySelector('.close-btn');
			closeBtn.addEventListener('click', () => {
				dlDialog.close();
			});
			dlDialog.showModal();

			async function buildKeyTree(records) {
				let tree = {};
				for (let record of records) {
					async function addToTree(obj, record, prefix = '') {
						for (let key of Object.keys(record)) {
							if (record.hasOwnProperty(key)) {
								const value = record[key];
								const fullKey = prefix
									? `${prefix}.${key}`
									: key;
								if (
									typeof value === 'object' &&
									value !== null
								) {
									if (!obj[fullKey]) {
										obj[fullKey] = {};
									}
									await addToTree(
										obj[fullKey],
										value,
										fullKey,
									);
								} else {
									obj[fullKey] = null;
								}
							}
						}
					}
					await addToTree(tree, record);
				}
				return tree;
			}

			async function generateListTree(tree, container) {
				const ul = document.createElement('ul');
				ul.style.listStyleType = 'none';
				tree = Object.keys(tree)
					.sort()
					.reduce((obj, key) => {
						obj[key] = tree[key];
						return obj;
					}, {});

				for (let key in tree) {
					if (tree.hasOwnProperty(key)) {
						const li = document.createElement('li');
						const checkbox = document.createElement('input');
						checkbox.type = 'checkbox';
						checkbox.classList.add('data-item');
						checkbox.id = key;
						checkbox.name = key;

						if (
							key === 'content' ||
							key === 'account.acct' ||
							key === 'created_at' ||
							key === 'url' ||
							(checkedMetadata &&
								checkedMetadata.length &&
								checkedMetadata.includes(key))
						) {
							checkbox.checked = true;
						}

						const label = document.createElement('label');
						label.htmlFor = key;
						label.appendChild(
							document.createTextNode(key.split('.').pop()),
						);

						li.appendChild(checkbox);
						li.appendChild(label);
						ul.appendChild(li);

						if (tree[key] !== null) {
							let arrow = document.createElement('span');
							arrow.classList.add('arrow');
							arrow.textContent = '[more]';
							label.after(arrow);
							const nestedContainer =
								document.createElement('div');
							nestedContainer.classList.add('nested-container');
							nestedContainer.style.marginLeft = '20px';
							nestedContainer.style.height = '0px';
							arrow.addEventListener('click', (e) => {
								e.stopPropagation();
								if (nestedContainer.style.height === '0px') {
									nestedContainer.style.height = 'auto';
									arrow.textContent = '[less]';
								} else {
									const nestedContainers = Array.from(
										li.querySelectorAll(
											'div.nested-container',
										),
									);
									nestedContainers.forEach((container) => {
										container.style.height = '0px';
									});
									const arrows = Array.from(
										li.querySelectorAll('span.arrow'),
									);
									arrows.forEach((a) => {
										a.textContent = '[more]';
									});
								}
							});
							generateListTree(tree[key], nestedContainer);
							li.appendChild(nestedContainer);

							checkbox.addEventListener('change', function () {
								const childCheckboxes =
									nestedContainer.querySelectorAll(
										'input[type="checkbox"]',
									);
								childCheckboxes.forEach((childCheckbox) => {
									childCheckbox.checked = checkbox.checked;
									childCheckbox.indeterminate = false;
								});
								if (checkbox.checked) {
									nestedContainer.style.height = 'auto';
									arrow.textContent = '[less]';
								} else {
									nestedContainer.style.height = '0px';
									arrow.textContent = '[more]';
								}
							});
						}

						checkbox.addEventListener('change', function () {
							updateParentCheckboxes(checkbox);
						});
					}
				}
				Array.from(
					container.querySelectorAll("input[type='checkbox']"),
				).forEach((checkbox) => {
					if (checkbox.checked) {
						updateParentCheckboxes(checkbox);
					}
				});
				container.appendChild(ul);
			}
		}

		function updateParentCheckboxes(checkbox) {
			const parentLi = checkbox.closest('li').parentElement.closest('li');
			if (parentLi) {
				const parentCheckbox = parentLi.querySelector(
					'input[type="checkbox"]',
				);
				const childCheckboxes = parentLi.querySelectorAll(
					'div > ul > li > input[type="checkbox"]',
				);
				const allChecked = Array.from(childCheckboxes).every(
					(child) => child.checked,
				);
				const someChecked = Array.from(childCheckboxes).some(
					(child) => child.checked,
				);

				parentCheckbox.checked = allChecked;
				parentCheckbox.indeterminate = !allChecked && someChecked;

				updateParentCheckboxes(parentCheckbox);
			}
		}

		let fileFormat = 'xml';
		formatSelect.addEventListener('change', () => {
			const tableFormat = dlDialog.querySelector(
				'label[for="table-checkbox"]',
			);
			fileFormat = formatSelect.value;
			if (fileFormat === 'xlsx') {
				tableFormat.style.display = 'block';
				const tableCheckbox = dlDialog.querySelector(
					'input#table-checkbox',
				);
				tableCheckbox.checked = true;
			} else {
				tableFormat.style.display = 'none';
			}
		});

		// Listen to anonymize checkbox
		anonymizeCheckbox.addEventListener('change', () => {
			const authorHandleCheckbox =
				document.getElementById('account.acct');
			if (anonymizeCheckbox.checked) {
				authorHandleCheckbox.checked = true;
				authorHandleCheckbox.disabled = true;
				authorHandleCheckbox.nextElementSibling.textContent +=
					' (required for anonymization)';
				updateParentCheckboxes(authorHandleCheckbox);
			} else {
				authorHandleCheckbox.disabled = false;
				authorHandleCheckbox.nextElementSibling.textContent = 'acct';
			}
		});

		// Listen to download button
		dlConfirmBtn.addEventListener('click', async () => {
			await buildData();
			if (fileFormat === 'json') {
				downloadJson();
			} else if (fileFormat === 'csv') {
				downloadCsv();
			} else if (fileFormat === 'xml') {
				downloadXml();
			} else if (fileFormat === 'txt') {
				downloadTxt();
			} else if (fileFormat === 'xlsx') {
				downloadXlsx();
			} else if (fileFormat === 'ske') {
				downloadSke();
			}
			downloaded = true;
		});

		function getNestedValue(obj, keyPath) {
			return keyPath
				.split('.')
				.reduce((acc, key) => acc && acc[key], obj);
		}

		async function buildData() {
			return new Promise((resolve) => {
				const anonymize = anonymizeCheckbox.checked;
				const accts = new Set();
				const pseudos = {};
				if (anonymize) {
					for (let s of statuses) {
						accts.add(s.account.acct);
					}
					for (let acct of accts) {
						pseudos[acct] = `user_${
							Object.keys(pseudos).length + 1
						}`;
					}
				}
				posts = [];
				const checkboxes = dlDialog.querySelectorAll(
					'input[type="checkbox"].data-item',
				);
				let checkedCheckboxes = Array.from(checkboxes)
					.filter((checkbox) => checkbox.checked)
					.map((checkbox) => checkbox.id);
				chrome.storage.local.set({
					tsCheckedMetadata: checkedCheckboxes,
				});
				for (let s of statuses) {
					if (anonymize) {
						s.account.acct = pseudos[s.account.acct];
						s.account.display_name = pseudos[s.account.acct];
					}
					let post = {};
					for (let checkbox of checkboxes) {
						if (checkbox.checked) {
							const key = checkbox.id;
							const value = getNestedValue(s, key);
							post[key.replaceAll('.', '-')] = value;
						}
					}
					posts.push(post);
				}
				resolve();
			});
		}

		// Download functions
		function downloadCsv() {
			const spinner = document.createElement('span');
			spinner.classList.add('spinner');
			dlConfirmBtn.textContent = '';
			dlConfirmBtn.appendChild(spinner);
			spinner.style.display = 'inline-block';
			const header = Object.keys(posts[0]).join('\t');
			const rows = posts.map((post) => Object.values(post).join('\t'));
			const csv = [header, ...rows].join('\n');
			const blob = new Blob([csv], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'TruthSocial_scrape.csv';
			spinner.remove();
			dlConfirmBtn.textContent = 'Download';
			anchor.click();
		}

		function downloadJson() {
			const spinner = document.createElement('span');
			spinner.classList.add('spinner');
			dlConfirmBtn.textContent = '';
			dlConfirmBtn.appendChild(spinner);
			spinner.style.display = 'inline-block';
			const json = JSON.stringify(posts, null, 2);
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'TruthSocial_scrape.json';
			spinner.remove();
			dlConfirmBtn.textContent = 'Download';
			anchor.click();
		}

		function downloadXml() {
			const spinner = document.createElement('span');
			spinner.classList.add('spinner');
			dlConfirmBtn.textContent = '';
			dlConfirmBtn.appendChild(spinner);
			spinner.style.display = 'inline-block';
			let xml = '<Text>';
			for (let p of posts) {
				let postData = '<lb/>\n<post';
				for (let [key, value] of Object.entries(p)) {
					if (typeof value === 'string') {
						p[key] = value
							.replaceAll('&nbsp;', ' ')
							.replaceAll(/&/g, '&amp;')
							.replaceAll(/</g, '&lt;')
							.replaceAll(/>/g, '&gt;')
							.replaceAll(/"/g, '&quot;')
							.replaceAll(/'/g, '&apos;')
							.replaceAll(/\u00A0/g, ' ');
					}
					if (key.includes('_')) {
						delete p[key];
						let keyParts = key.split('_');
						keyParts.forEach((part, index) => {
							if (index > 0) {
								keyParts[index] =
									part.charAt(0).toUpperCase() +
									part.slice(1);
							}
						});
						key = keyParts.join('');
						p[key] = value;
					}
					if (key !== 'content' && key !== 'url') {
						postData += ` ${key}="${p[key]}"`;
					}
				}
				postData += '>';
				postData += `<lb/><ref target="${p.url}">Link to post</ref><lb/>`;
				let text = p['content'];
				const urlRegex =
					/(?:https?|ftp):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[-A-Za-z0-9+&@#\/%=~_|]/;
				const links = text.match(urlRegex);
				if (links) {
					for (l of links) {
						const newLink = l.replace(
							/(.+)/,
							`<ref target="$1">$1</ref>`,
						);
						text = text.replace(l, newLink);
					}
				}
				postData += `<lb/>${text.replaceAll(/\n/g, '<lb/>')}`;
				postData += '</post><lb/><lb/>\n';
				xml += postData;
			}
			xml += `</Text>`;
			const blob = new Blob([xml], { type: 'application/xml' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'TruthSocial_scrape.xml';
			spinner.remove();
			dlConfirmBtn.textContent = 'Download';
			anchor.click();
		}

		function downloadSke() {
			const spinner = document.createElement('span');
			spinner.classList.add('spinner');
			dlConfirmBtn.textContent = '';
			dlConfirmBtn.appendChild(spinner);
			spinner.style.display = 'inline-block';
			let xml = '';
			for (let p of posts) {
				let postData = '<post';
				for (let [key, value] of Object.entries(p)) {
					if (typeof value === 'string') {
						p[key] = value
							.replaceAll('&nbsp;', ' ')
							.replaceAll(/&/g, '&amp;')
							.replaceAll(/</g, '&lt;')
							.replaceAll(/>/g, '&gt;')
							.replaceAll(/"/g, '&quot;')
							.replaceAll(/'/g, '&apos;')
							.replaceAll(/\u00A0/g, ' ');
					}
					if (key.includes('-')) {
						delete p[key];
						key = key.replaceAll(/\W/g, '_');
						p[key] = value;
					}
					if (key !== 'content') {
						postData += ` ${key}="${p[key]}"`;
					}
				}
				postData += '>';
				postData += p['content'];
				postData += '</post>\n\n';
				xml += postData;
			}
			const blob = new Blob([xml], { type: 'application/xml' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'TruthSocial_scrape.xml';
			spinner.remove();
			dlConfirmBtn.textContent = 'Download';
			anchor.click();
		}

		function downloadTxt() {
			const spinner = document.createElement('span');
			spinner.classList.add('spinner');
			dlConfirmBtn.textContent = '';
			dlConfirmBtn.appendChild(spinner);
			spinner.style.display = 'inline-block';
			let txt = '';
			for (let p of posts) {
				let postData = p['content'];
				postData += '\n\n';
				txt += postData;
			}
			const blob = new Blob([txt], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'TruthSocial_scrape.txt';
			spinner.remove();
			dlConfirmBtn.textContent = 'Download';
			anchor.click();
		}

		async function downloadXlsx() {
			const manifestVersion =
				chrome.runtime.getManifest().manifest_version;
			if (manifestVersion === 3) {
				const tableCheckbox = dialog.querySelector('#table-checkbox');
				chrome.runtime.sendMessage(
					{
						action: 'generateXlsx',
						posts: posts,
						formatTable: tableCheckbox.checked,
					},
					(response) => {
						if (response && response.success) {
							const binaryUrl = response.url;
							const binaryString = atob(binaryUrl.split(',')[1]);
							const len = binaryString.length;
							const bytes = new Uint8Array(len);
							for (let i = 0; i < len; i++) {
								bytes[i] = binaryString.charCodeAt(i);
							}
							const blob = new Blob([bytes], {
								type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
							});
							const url = URL.createObjectURL(blob);
							const anchor = document.createElement('a');
							anchor.href = url;
							anchor.download = 'TruthSocial_scrape.xlsx';
							anchor.click();
						} else {
							console.error(
								'Error generating XLSX:',
								response.error,
							);
						}
					},
				);
				return;
			}
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

			const tableCheckbox = dialog.querySelector('#table-checkbox');
			if (tableCheckbox.checked) {
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
					let cellLength = cellValue
						? cellValue.toString().length
						: 10;
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
			const blob = new Blob([buffer], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'TruthSocial_scrape.xlsx';
			anchor.click();
		}

		// Assign role to reset button
		resetBtn.addEventListener('click', () => {
			const inputs = searchContainer.querySelectorAll('input');
			for (let input of inputs) {
				input.value = '';
			}
			location.reload();
		});
		return true;
	}
});
