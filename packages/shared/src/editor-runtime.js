// Runs only inside the app's offline editor document. Build with scripts/build-editor.mjs.
export function editorRuntime(config, extract) {
  const editor = document.getElementById('editor');
  let savedRange = null;
  let decorating = false;
  let composing = false;
  let pressOrigin = null;
  let timer;
  let pressTimer;
  let longPressed = false;
  const blocks = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE']);
  const send = (payload) => {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    else window.parent.postMessage({ beaconEditor: true, payload }, '*');
  };
  function plainText() {
    // Read the DOM structure directly: innerText on a hidden clone can be empty.
    function read(node) {
      if (node.nodeType === 3) return node.textContent.replace(/\u00a0/g, ' ');
      if (node.nodeType !== 1) return '';
      if (node.tagName === 'BR') return '\n';
      if (node.tagName === 'INPUT') return node.checked ? '☑ ' : '☐ ';
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        let index = 0;
        return [...node.childNodes]
          .map((child) => {
            const text = read(child);
            if (child.nodeType !== 1 || child.tagName !== 'LI') return text;
            index += 1;
            return `${node.tagName === 'OL' ? `${index}. ` : '• '}${text.trimEnd()}\n`;
          })
          .join('');
      }
      const text = [...node.childNodes].map(read).join('');
      return blocks.has(node.tagName) ? `${text}\n` : text;
    }
    return read(editor)
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();
  }
  function sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const allowed = new Set([
      'P',
      'DIV',
      'H1',
      'H2',
      'H3',
      'STRONG',
      'B',
      'EM',
      'I',
      'U',
      'UL',
      'OL',
      'LI',
      'BLOCKQUOTE',
      'BR',
      'SPAN',
      'INPUT',
    ]);
    function visit(parent) {
      for (const child of [...parent.childNodes]) {
        if (child.nodeType === 3) continue;
        if (child.nodeType !== 1) {
          child.remove();
          continue;
        }
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(child.tagName)) {
          child.remove();
          continue;
        }
        if (!allowed.has(child.tagName)) {
          visit(child);
          child.replaceWith(...child.childNodes);
          continue;
        }
        if (child.tagName === 'SPAN') {
          visit(child);
          child.replaceWith(...child.childNodes);
          continue;
        }
        const checked =
          child.tagName === 'INPUT' && (child.checked || child.hasAttribute('checked'));
        const checkbox = child.tagName === 'INPUT' && child.getAttribute('type') === 'checkbox';
        for (const attribute of [...child.attributes]) child.removeAttribute(attribute.name);
        if (child.tagName === 'INPUT') {
          if (!checkbox) {
            child.remove();
            continue;
          }
          child.setAttribute('type', 'checkbox');
          child.setAttribute('contenteditable', 'false');
          child.setAttribute('aria-label', 'Checklist item');
          if (checked) child.setAttribute('checked', 'checked');
        }
        visit(child);
        if (child.tagName === 'BLOCKQUOTE' && extract(child.textContent)[0])
          child.dataset.passage = JSON.stringify(extract(child.textContent)[0]);
      }
    }
    visit(template.content);
    return template.innerHTML;
  }
  function remember() {
    const selection = window.getSelection();
    if (
      selection?.rangeCount &&
      editor.contains(selection.anchorNode) &&
      editor.contains(selection.focusNode)
    ) {
      savedRange = selection.getRangeAt(0).cloneRange();
      send({ type: 'selection', text: selection.toString() });
    }
  }
  // Bookmark each endpoint inside its own paragraph/list item. A document-wide
  // text offset cannot distinguish the end of a paragraph from a new empty one.
  function positionLength(node) {
    if (node.nodeType === 3) return node.length;
    if (node.nodeName === 'BR' || node.nodeName === 'INPUT') return 1;
    return (
      [...node.childNodes].reduce((total, child) => total + positionLength(child), 0) +
      (blocks.has(node.nodeName) ? 1 : 0)
    );
  }
  function bookmarkPoint(node, offset) {
    const element = node.nodeType === 3 ? node.parentElement : node;
    const scope = element.closest('p,div,h1,h2,h3,li,blockquote') ?? editor;
    const before = document.createRange();
    before.selectNodeContents(scope);
    before.setEnd(node, offset);
    return { scope, offset: positionLength(before.cloneContents()) };
  }
  function bookmarkSelection() {
    const selection = window.getSelection();
    if (
      !selection?.rangeCount ||
      !editor.contains(selection.anchorNode) ||
      !editor.contains(selection.focusNode)
    )
      return null;
    return {
      anchor: bookmarkPoint(selection.anchorNode, selection.anchorOffset),
      focus: bookmarkPoint(selection.focusNode, selection.focusOffset),
    };
  }
  function resolvePoint({ scope, offset }) {
    let remaining = offset;
    function visit(parent) {
      for (const [index, child] of [...parent.childNodes].entries()) {
        const length = positionLength(child);
        if (remaining > length) {
          remaining -= length;
          continue;
        }
        if (child.nodeType === 3) return [child, remaining];
        if (child.nodeName === 'BR' || child.nodeName === 'INPUT')
          return [parent, index + remaining];
        if (blocks.has(child.nodeName) && remaining === length) return [parent, index + 1];
        return visit(child);
      }
      return [parent, parent.childNodes.length];
    }
    return visit(scope);
  }
  function restoreSelection(bookmark) {
    if (!bookmark) return;
    const selection = window.getSelection();
    selection.setBaseAndExtent(...resolvePoint(bookmark.anchor), ...resolvePoint(bookmark.focus));
    savedRange = selection.getRangeAt(0).cloneRange();
  }
  function highlight() {
    if (decorating || composing) return;
    if (!editor.querySelector('[data-scripture]') && !extract(editor.textContent).length) return;
    decorating = true;
    const bookmark = bookmarkSelection();
    for (const span of editor.querySelectorAll('[data-scripture]'))
      span.replaceWith(...span.childNodes);
    editor.normalize();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.textContent;
      const refs = extract(text);
      if (!refs.length) continue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const ref of refs) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, ref.start)));
        const span = document.createElement('span');
        span.dataset.scripture = JSON.stringify(ref);
        span.className = 'scripture';
        span.textContent = ref.raw;
        span.setAttribute('title', 'Tap to edit; hold to read this passage.');
        fragment.appendChild(span);
        cursor = ref.end;
      }
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
    }
    restoreSelection(bookmark);
    decorating = false;
  }
  function emit() {
    editor.dataset.empty = String(!plainText().trim());
    send({ type: 'change', html: editor.innerHTML, text: plainText() });
  }
  function focusSaved() {
    editor.focus();
    const selection = window.getSelection();
    if (savedRange && editor.contains(savedRange.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  function command(name) {
    focusSaved();
    const commands = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      ordered: 'insertOrderedList',
      unordered: 'insertUnorderedList',
      undo: 'undo',
      redo: 'redo',
    };
    if (commands[name]) document.execCommand(commands[name], false);
    else if (name === 'heading') document.execCommand('formatBlock', false, 'h2');
    else if (name === 'paragraph') document.execCommand('formatBlock', false, 'p');
    else if (name === 'checkbox')
      document.execCommand(
        'insertHTML',
        false,
        '<p><input type="checkbox" contenteditable="false" aria-label="Checklist item">&nbsp;</p>',
      );
    remember();
    emit();
    clearTimeout(timer);
    timer = setTimeout(highlight, 120);
  }
  function appendText(text) {
    const reference = extract(text.split('\n')[0])[0];
    const block = document.createElement(reference ? 'blockquote' : 'p');
    if (reference) block.dataset.passage = JSON.stringify(reference);
    block.style.whiteSpace = 'pre-wrap';
    block.textContent = text;
    editor.appendChild(block);
    highlight();
    emit();
  }
  function referenceFrom(event, includePassage = false) {
    const target = event.target?.closest?.(
      includePassage ? '[data-scripture], [data-passage]' : '[data-scripture]',
    );
    if (!target) return null;
    const reference = extract(target.textContent)[0];
    return reference ?? null;
  }
  editor.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(timer);
  });
  editor.addEventListener('compositionend', () => {
    composing = false;
    remember();
    emit();
    clearTimeout(timer);
    timer = setTimeout(highlight, 180);
  });
  editor.addEventListener('input', (event) => {
    if (decorating) return;
    remember();
    emit();
    clearTimeout(timer);
    if (!composing && !event.isComposing) timer = setTimeout(highlight, 180);
  });
  editor.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"]')) {
      if (event.target.checked) event.target.setAttribute('checked', 'checked');
      else event.target.removeAttribute('checked');
      emit();
    }
  });
  editor.addEventListener('paste', (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  });
  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressOrigin = null;
  };
  editor.addEventListener('pointerdown', (event) => {
    cancelPress();
    longPressed = false;
    if (event.button !== undefined && event.button !== 0) return;
    const reference = referenceFrom(event, true);
    if (reference) {
      pressOrigin = { x: event.clientX, y: event.clientY };
      pressTimer = setTimeout(() => {
        longPressed = true;
        remember();
        send({ type: 'reference', reference, intent: 'actions' });
      }, 550);
    }
  });
  editor.addEventListener('pointerup', cancelPress);
  editor.addEventListener('pointercancel', cancelPress);
  editor.addEventListener('pointermove', (event) => {
    if (pressOrigin && Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) > 8)
      cancelPress();
  });
  editor.addEventListener('scroll', cancelPress, true);
  editor.addEventListener('contextmenu', (event) => {
    const reference = referenceFrom(event, true);
    if (reference) {
      event.preventDefault();
      cancelPress();
      if (!longPressed) send({ type: 'reference', reference, intent: 'actions' });
      longPressed = true;
    }
  });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.altKey) {
      const node = window.getSelection()?.anchorNode;
      const target = node?.nodeType === 3 ? node.parentElement : node;
      const reference = referenceFrom({ target }, true);
      if (reference) {
        event.preventDefault();
        cancelPress();
        remember();
        send({ type: 'reference', reference, intent: 'actions' });
      }
    }
  });
  document.addEventListener('selectionchange', () => {
    if (!decorating) remember();
  });
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || !event.data?.beaconCommand) return;
    const message = event.data;
    if (message.command === 'connect') {
      send({ type: 'ready' });
      emit();
    } else if (message.command === 'theme') setTheme(message.colors);
    else if (message.command === 'append') appendText(String(message.text ?? ''));
    else command(String(message.command));
  });
  function setTheme(colors) {
    for (const key of ['background', 'ink', 'muted', 'green', 'gold', 'scripture', 'soft'])
      if (/^#[0-9a-f]{6}$/i.test(colors?.[key] ?? ''))
        document.documentElement.style.setProperty(`--${key}`, colors[key]);
  }
  window.BeaconEditor = {
    setTheme,
    command,
    appendText,
    getHtml: () => editor.innerHTML,
    getText: plainText,
  };
  editor.setAttribute('data-placeholder', config.placeholder);
  editor.innerHTML = config.html
    ? sanitize(config.html)
    : config.text
        .split('\n')
        .map((line) => {
          const p = document.createElement('p');
          p.textContent = line;
          if (!line) p.appendChild(document.createElement('br'));
          return p.outerHTML;
        })
        .join('');
  highlight();
  editor.dataset.empty = String(!plainText().trim());
  send({ type: 'ready' });
  emit();
}
