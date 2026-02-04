<img width="722" height="58" alt="truth-logo" src="https://github.com/user-attachments/assets/c69b7c90-0411-418e-9656-a65796aa7660" />  
  
An extension for extracting and downloading Truth Social posts for text mining and analysis.

### Cite this program

If you use this extension for your research, please reference it as follows:

Moncomble, F. ([2025] 2026). _TruthScraper_ (Version 0.5) [JavaScript]. Arras, France: Université d'Artois. Available at: https://fmoncomble.github.io/truthscraper/

## Important notice

For research purposes only, in compliance with relevant copyright and privacy legislation and [Truth Social’s Terms of Service](https://help.truthsocial.com/legal/terms-of-service/).

## Installation

### Firefox

[![Firefox add-on](https://github.com/fmoncomble/Figaro_extractor/assets/59739627/e4df008e-1aac-46be-a216-e6304a65ba97)](https://github.com/fmoncomble/truthscraper/releases/latest/download/truthscraper.xpi)

### Chrome/Edge and other Chromium-based browsers

[![available-chrome-web-store4321](https://github.com/fmoncomble/SocialCorpusScraper/assets/59739627/e497b504-5836-4acd-a283-96f53366d290)](https://chrome.google.com/webstore/detail/mnholfdnbpigchhdjblfgjmfplpeecep)

**Remember to pin the add-on to the toolbar.**

## Instructions for use

- Click the add-on's icon in the toolbar.
- On first using the add-on, follow the authentication procedure to authorize the app on Truth Social. _All credentials are stored locally on your computer, **not** on a remote server._
- Choose a search mode or user history mode.
    - In guided or expert search mode, build your search query with at least one keyword, and click `Search`.
    - In user history mode, type the username of the account whose posts you want to retrieve, and click `Search`.
- (Optional) Enter the maximum number of toots to collect.
- You can stop the process at any time by clicking `Abort`.
- When all posts have been collected, a dialog opens for you to select the metadata to include in the file. By default, account name, date, content and URL are included.
- Choose your preferred output format:
    - `XML/XTZ (TXM)` for an XML file to import into [TXM](https://txm.gitpages.huma-num.fr/textometrie/en/index.html) using the `XML/TEI-Zero` module
        - When initiating the import process, open the "Textual planes" section and type `ref` in the field labelled "Out of text to edit"
    - `XML (Sketch Engine)` for an XML file formatted for import into [Sketch Engine](https://www.sketchengine.eu/)
    - `TXT` for plain text
    - `CSV`
    - `XLSX`
    - `JSON`
- Click `Download` to save the file to the location of your choice.
- Click `Reset` to start afresh.

## Known limitations

- Searching by language is not built into the Truth Social API, meaning that results are filtered from the whole query response, which may take some time depending on the chosen criteria.
- Truth Social's server is sensitive to automatic activity. As a result, the user may be temporarily blocked. There is a mechanism around that but if it fails you may need to wait or use a VPN.
