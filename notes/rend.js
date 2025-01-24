// 获取body中所有的文本，将形如 "{xxx}"的都替换成"<span class='code'>xxx</span>"

function remove_all_prepending_spaces(lines) {
    // 统计每行开头的空格数
    const indents = lines.map(line => {
        const match = line.match(/^\s*/);
        return match ? match[0].length : 0;
    });
    // 找到最小的空白字符数
    const min_indent = Math.min(...indents);
    // 删除所有开头的空白字符
    lines.forEach((line, i) => {
        if (indents[i] > 0) {
            lines[i] = line.slice(min_indent);
        }
    });
}

function lines_to_nodes(lines) {
    const length = lines.length;
    return lines.flatMap((line, i) => {
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

        if (i < length - 1) {
            // result.push(document.createElement('br'));
        }
        return result;
    })
}

function code_span(text) {
    // 如果没有换行，直接返回一个span节点
    if (!/\n/.test(text)) {
        const span = document.createElement('span');
        span.classList.add('code');
        span.textContent = text;
        return span;
    } else {
        // 如果有换行，先拆分成每行，删除首尾空白行
        const lines = text.split('\n');
        if (/^\s*$/.test(lines[0])) {
            lines.shift();
        }
        if (/^\s*$/.test(lines[lines.length - 1])) {
            lines.pop();
        }
        remove_all_prepending_spaces(lines);

        const span = document.createElement('span');
        span.classList.add('code');
        span.classList.add('multiline');
        span.append(...lines_to_nodes(lines));

        return span;
    }
}

function replace_text_to_code_span(node) {
    // 遍历每个子节点
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE &&
            child.tagName.toLowerCase() !== 'script') {
            replace_text_to_code_span(child);
        } else if (child.nodeType === Node.TEXT_NODE) {
            let need_replace = false;
            const replaced = child.textContent.split(/(\{[^\}]+\})/).map(part => {
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

window.addEventListener('DOMContentLoaded', () => {
    replace_text_to_code_span(document.body);
});
