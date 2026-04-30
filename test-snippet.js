const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Add clipboard permissions
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.on("console", msg => console.log("LOG:", msg.text()));
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(1000);
  
  await page.click("text=CodeSnippet");
  await page.waitForTimeout(1000);

  const snippetStatus = await page.evaluate(async () => {
    let result = [];
    function findTag(root, tag) {
      if (root.tagName && root.tagName.toLowerCase() === tag) return root;
      if (root.shadowRoot) {
        const res = findTag(root.shadowRoot, tag);
        if (res) return res;
      }
      for (const child of root.children) {
        const res = findTag(child, tag);
        if (res) return res;
      }
      return null;
    }
    const c = findTag(document.body, "a2learn-code-snippet");
    if (!c) return ["CodeSnippet not found"];
    
    const btn = c.shadowRoot.querySelector(".copy-btn");
    result.push("Button text before: " + (btn ? btn.textContent.trim() : "no button"));
    
    if (btn) {
      btn.click();
      result.push("Clicked button");
    }
    
    // Wait for Lit to re-render (since state updates are async)
    await new Promise(r => setTimeout(r, 100));
    
    result.push("Button text after: " + (btn ? btn.textContent.trim() : "no button"));
    
    return result;
  });
  
  console.log("CodeSnippet Status:", snippetStatus);

  await browser.close();
})();
