const dark = document.getElementById("dark");

chrome.storage.local.get(["dark"], ({ dark: v }) => { dark.checked = !!v; });
dark.onchange = () => chrome.storage.local.set({ dark: dark.checked });
