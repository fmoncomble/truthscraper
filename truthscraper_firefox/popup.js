document.addEventListener('DOMContentLoaded', function () {
    const version = chrome.runtime.getManifest().version;
    document.getElementById('version-div').textContent = 'v' + version;

    const errorMsg = document.getElementById('error-msg');
    const startBtn = document.getElementById('start-btn');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        const url = tab ? tab.url : '';
        if (url !== 'https://truthsocial.com/') {
            errorMsg.style.display = 'inline-block';
        } else {
            checkPermissions();
        }
    });

    startBtn.addEventListener('click', function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: 'scrape',
                    },
                    (response) => {
                        console.log('Response = ', response);
                    }
                );
            }
        );
        window.close();
    });

    // This function checks if the extension has the necessary permissions
    async function checkPermissions() {
        const permissionsToCheck = {
            origins: ['*://truthsocial.com/*'],
        };

        const hasPermissions = await chrome.permissions.contains(
            permissionsToCheck
        );
        if (!hasPermissions) {
            document.getElementById('grant-permissions').style.display =
                'block';
        } else if (hasPermissions) {
            document.getElementById('start-container').style.display =
                'block';
        }
    }

    // This function requests permissions
    async function requestPermissions() {
        const permissionsToRequest = {
            origins: ['*://truthsocial.com/*'],
        };

        function onResponse(response) {
            if (response) {
                console.log('Permission was granted');
            } else {
                console.log('Permission was refused');
            }
            return chrome.permissions.getAll();
        }

        const response = await chrome.permissions.request(permissionsToRequest);
        const currentPermissions = await onResponse(response);
        console.log(`Current permissions:`, currentPermissions);
    }

    document
        .getElementById('grant-permissions')
        .addEventListener('click', requestPermissions);
});
