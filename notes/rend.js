// 获取body中所有的文本，将形如 "{xxx}"的都替换成"<span class='code'>xxx</span>"

// function remove_all_prepending_spaces(lines) {
//     // 统计每行开头的空格数
//     const indents = lines.map(line => {
//         const match = line.match(/^\s*/);
//         return match ? match[0].length : 0;
//     });
//     // 找到最小的空白字符数
//     const min_indent = Math.min(...indents);
//     // 删除所有开头的空白字符
//     lines.forEach((line, i) => {
//         if (indents[i] > 0) {
//             lines[i] = line.slice(min_indent);
//         }
//     });
// }

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

        // 遍历每行，构造一个文本节点
        const line_nodes = lines.map(line =>
            document.createTextNode(line)
        );
        // 构造一个span节点，包含所有nodes，每两个之间插入一个<br>
        const span = document.createElement('span');
        span.classList.add('code');
        span.classList.add('multiline');

        for (let i = 0; i < line_nodes.length; i++) {
            // 判断是否有分号，分号后面是注释内容，放入span中
            const semicolon_index = line_nodes[i].textContent.indexOf(';');
            if (semicolon_index !== -1) {
                const comment_node = document.createElement('span');
                comment_node.classList.add('comment');
                comment_node.textContent = line_nodes[i].textContent.slice(semicolon_index);
                line_nodes[i].textContent = line_nodes[i].textContent.slice(0, semicolon_index);
                span.appendChild(line_nodes[i]);
                span.appendChild(comment_node);
            } else {
                span.appendChild(line_nodes[i]);
            }
            // 最后一个节点不加<br>
            if (i < line_nodes.length - 1) {
                span.appendChild(document.createElement('br'));
            }
        }
        return span;
    }
}

function rend(node) {
    // 遍历每个子节点
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        // 如果是元素节点，递归调用rend
        if (child.nodeType === Node.ELEMENT_NODE) {
            // 如果是script标签，跳过
            if (child.tagName.toLowerCase() !== 'script')
                rend(child);
        }
        // 如果是文本节点，替换掉形如"{xxx}"的文本
        else if (child.nodeType === Node.TEXT_NODE) {
            // 找到拆分位置
            const parts = child.textContent.split(/(\{[^\}]+\})/);
            // 遍历每个部分
            for (let j = 0; j < parts.length; j++) {
                const part = parts[j];
                // 如果是"{xxx}"，替换成<span class='code'>xxx</span>
                if (part.startsWith('{') && part.endsWith('}')) {
                    const code = part.slice(1, -1)
                    parts[j] = code_span(code);
                }
            }
            // 构造一个新的节点，包含所有部分
            const new_node = document.createElement('span');
            new_node.append(...parts);
            // 替换掉原来的节点
            node.replaceChild(new_node, child);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    rend(document.body);
});
