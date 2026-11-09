# CardioFlow Pro

CardioFlow Pro 是一套心血管病例教學工具，包含教師題庫管理、學生端病例模擬與測驗，以及 Google 試算表資料橋接程式。

## 專案結構

| 路徑 | 用途 |
|---|---|
| `teacher/index.html` | 教師後台介面：查看、編輯、啟用或停用題目，並預覽題目 |
| `teacher/functions.gs` | 教師後台的 Google Apps Script，負責讀寫題庫試算表 |
| `student/index.html` | 學生前台：心血管模擬器與病例測驗 |
| `student/functions.gs` | 學生前台的 Apps Script 網頁入口 |
| `questions/linker.gs` | 題庫資料橋接程式，提供前台讀取題目及寫入試算表的功能 |

教師後台、學生前台與題庫橋接程式是分開部署的 Apps Script 專案。它們透過 Google 試算表和 Apps Script 網頁應用程式連接。

## 資料流程

### 教師後台

1. 教師開啟後台 Apps Script 網頁。
2. 後台透過 `google.script.run` 呼叫 `teacher/functions.gs` 的函式。
3. `functions.gs` 使用試算表 ID 和工作表名稱 `Questions` 連接題庫。
4. 新增或編輯單題時，呼叫 `saveQuestionToSheet()`。
5. 批次匯入或其他需要整批同步的操作，呼叫 `saveQuestionsToSheet()`。

### 學生前台

1. 學生開啟學生端 Apps Script 網頁。
2. `student/index.html` 呼叫題庫橋接程式的 `/exec` 網址。
3. 題庫程式從 `Questions` 工作表讀取題目，並以 JSONP 格式回傳。
4. 學生前台將題目轉換成測驗使用的資料格式。

目前學生端會使用回傳的題目進行測驗。每答對一題加 50 分；目前程式中的題目數量選擇與隨機抽題功能尚未實作。

## 題目資料格式

題目工作表使用以下欄位，順序需與程式讀寫欄位一致：

| 欄位 | 說明 |
|---|---|
| `id` | 題目識別碼 |
| `title` | 題目標題 |
| `category` | 題目分類 |
| `difficulty` | 難度 |
| `desc` | 病例描述 |
| `ava` | AVA 參數 |
| `pvr` | PVR 參數 |
| `portalRes` | Portal Resistance 參數 |
| `hr` | 心率參數 |
| `optionA` | 選項 A |
| `optionB` | 選項 B |
| `optionC` | 選項 C |
| `optionD` | 選項 D |
| `correctIndex` | 正確答案索引，`0` 代表 A、`1` 代表 B、`2` 代表 C、`3` 代表 D |
| `rationale` | 答案解析 |
| `active` | 題目是否啟用，填入 `TRUE` 或 `FALSE` |

請確認第一列是欄位標題，題目資料從第二列開始。

## 部署與設定

### 1. 設定試算表

建立或確認題庫試算表中有一個名為 `Questions` 的工作表，欄位順序依照上方表格設定。

教師後台的 `teacher/functions.gs` 會使用試算表 ID 和 `Questions` 工作表名稱連接資料。若換了試算表，需要檢查 `getSheet()` 裡的試算表 ID 是否正確。

### 2. 部署題庫橋接程式

1. 在連接題庫試算表的 Apps Script 專案中放入 `questions/linker.gs`。
2. 確認程式能取得正確的 `Questions` 工作表。
3. 將 Apps Script 部署為網頁應用程式。
4. 將部署產生的 `/exec` 網址設定到學生端 `student/index.html` 的 `QUESTION_API_URL`。

`linker.gs` 使用活頁中的目前試算表來讀寫資料，請確認 Apps Script 專案是綁定在正確的試算表上。

### 3. 部署教師後台

1. 在教師後台 Apps Script 專案加入 `teacher/index.html` 和 `teacher/functions.gs`。
2. 確認 `functions.gs` 中的試算表 ID 與工作表名稱正確。
3. 部署為網頁應用程式。
4. 將後台網址提供給需要管理題庫的教師。

### 4. 部署學生前台

1. 在學生前台 Apps Script 專案加入 `student/index.html` 和 `student/functions.gs`。
2. 確認 `student/index.html` 中的 `QUESTION_API_URL` 指向題庫橋接程式的 `/exec` 網址。
3. 部署為網頁應用程式。
4. 將學生端網址提供給學生。

## 啟用與停用題目

教師後台支援在題目卡片和題目編輯介面中調整題目啟用狀態。教師後台讀取工作表時，會依照 `active` 欄位判斷是否啟用；橋接程式讀取資料時也會依啟用欄位篩選題目。

## 重要注意事項

- `saveQuestionsToSheet()` 會清除工作表標題列以下的資料，再整批寫入。批次同步前請先備份題庫。
- `questions/linker.gs` 的 `doPost()` 會整張覆寫 `Questions` 工作表。不要把可供公開存取的寫入網址任意分享。
- 目前 `linker.gs` 的 `doPost()` 寫入資料時會將 `active` 欄設為 `TRUE`，沒有依照各題的啟用狀態寫入。若使用這個寫入入口進行同步，停用狀態可能無法保留。
- 學生端會接收正確答案索引及解析，因此適合課堂練習與教學使用，不適合需要保密答案的正式考試。
- 目前題庫是共用的，尚未依教師建立各自的題目集合；多位教師使用時會共同操作同一份題庫。
- 後台的「重置為預設題目」目前只重置瀏覽器端資料，不會自動將預設題目寫回 Google 試算表。
- 隨機選擇 5、10、15 題，以及重新開始時再次選擇題數，目前尚未加入這份學生端程式。

## 外部資源

頁面使用 Tailwind CSS CDN 與 Font Awesome 圖示。使用者開啟網頁時需要能連線載入這些外部資源。