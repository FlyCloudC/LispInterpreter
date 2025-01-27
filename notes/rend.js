function code_span(code_or_ref_text) {
    if (/\n/.test(code_or_ref_text)) {
        console.error(code_or_ref_text)
        return
        throw new Error('Multiline code should use outer reference');
    }

    const span = document.createElement('span');
    span.classList.add('code');
    span.textContent = code_or_ref_text;
    if (code_or_ref_text.startsWith('## ')) { // is reference
        span.classList.add('multiline');
        // 等待异步加载代码
    }
    return span;
}

/**
 * @param {string} code_text 
 */
function multiline_code_to_nodes(code_text) {
    // 如果有换行，先拆分成每行，删除首尾空白行
    const lines = code_text.split('\n');
    if (/^\s*$/.test(lines[0])) {
        lines.shift();
    }
    if (/^\s*$/.test(lines[lines.length - 1])) {
        lines.pop();
    }
    return lines.flatMap((line) => {
        const result = [];
        const indent = line.indexOf(';');

        if (indent === -1) {
            result.push(document.createTextNode(line + '\n'));
        } else {
            const code = line.slice(0, indent);
            const code_node = document.createTextNode(code);
            const comment = line.slice(indent);
            const comment_node = document.createElement('span');
            comment_node.classList.add('comment');
            comment_node.textContent = comment + '\n';
            result.push(code_node, comment_node);
        }
        return result;
    })
}

/**
 * @param {Node} node 
 */
function replace_text_to_code_span(node) {
    // 遍历每个子节点
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE &&
            child.tagName.toLowerCase() !== 'script') {
            replace_text_to_code_span(child);
        } else if (child.nodeType === Node.TEXT_NODE) {
            let need_replace = false;
            const replaced = child.textContent.split(/({.*?})/g).map(part => {
                if (part.startsWith('{') && part.endsWith('}')) {
                    need_replace = true;
                    return code_span(part.slice(1, -1));
                } else {
                    return document.createTextNode(part);
                }
            });
            if (need_replace) {
                if (replaced.length < 1) throw new Error('Invalid text node');
                for (let j = 0; j < replaced.length - 1; j++) {
                    node.insertBefore(replaced[j], child);
                }
                node.replaceChild(replaced[replaced.length - 1], child);
            }
        }
    }
}

/**
 * @param {string} url 
 */
async function fetch_code_example(url) {
    const response = await fetch(url);
    const text = await response.text();
    const codes = text.split('---');
    if (codes.length > 0 && codes[codes.length - 1].trim() === '') {
        codes.pop();
    }
    const map = new Map(codes.map(title_and_code => {
        title_and_code = title_and_code.trim();
        // 找到第一个换行符
        const index = title_and_code.indexOf('\n');
        if (index === -1) {
            throw new Error(`Invalid code block: ${title_and_code}`);
        }
        const title = title_and_code.slice(0, index);
        const code = title_and_code.slice(index + 1);
        return [title.trim(), code.trim()];
    }));
    return map;
}


/**
 * @param {Map<string, string>} code_map 
 */
function load_example(code_map) {
    // 获取所有的<span>节点
    const code_nodes = document.querySelectorAll('span');
    // 如果它的内容是"## xxx"，则替换成对应的代码
    code_nodes.forEach(node => {
        const text = node.textContent.trim();
        if (text.startsWith('## ')) {
            const title = text.slice(3);
            const code = code_map.get(title);
            if (code) {
                node.removeChild(node.firstChild);
                node.append(...multiline_code_to_nodes(code));
            } else {
                throw new Error(`Code not found: ${title}`);
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    replace_text_to_code_span(document.body);
    fetch_code_example('example.scm').then(load_example)
});
