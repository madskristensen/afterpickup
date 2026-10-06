/* Share a post. Phones get the system share sheet. Everywhere else
   copies the link. No third-party widgets. */
(function () {
  function copyWithTextarea(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.focus();
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      if (ok) resolve();
      else reject(err);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return copyWithTextarea(text);
      });
    }
    return copyWithTextarea(text);
  }

  var printButtons = document.querySelectorAll("[data-print]");
  for (var i = 0; i < printButtons.length; i++) {
    printButtons[i].addEventListener("click", function () {
      window.print();
    });
  }

  var root = document.querySelector(".post-share");
  if (!root) return;
  var button = root.querySelector("[data-share]");
  var label = root.querySelector("[data-label]");
  var status = root.querySelector("[data-status]");
  if (!button || !label) return;
  var defaultLabel = label.textContent;
  var timer = 0;

  function markCopied() {
    label.textContent = "Copied";
    button.classList.add("is-copied");
    if (status) status.textContent = "Link copied";
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      label.textContent = defaultLabel;
      button.classList.remove("is-copied");
      if (status) status.textContent = "";
    }, 2000);
  }

  function failCopy() {
    if (status) status.textContent = "Copy the address from the address bar.";
  }

  button.addEventListener("click", function () {
    var url = root.getAttribute("data-url") || "";
    var title = root.getAttribute("data-title") || document.title;
    var text = root.getAttribute("data-text") || "";
    if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) return;
    var payload = { title: title, text: text, url: url };
    if (typeof navigator.share === "function") {
      navigator.share(payload).catch(function (err) {
        if (err && err.name === "AbortError") return;
        copyText(url).then(markCopied, failCopy);
      });
      return;
    }
    copyText(url).then(markCopied, failCopy);
  });
})();
