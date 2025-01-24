let sourceForm, outputForm;

window.onload = () => {
  [sourceForm, outputForm, errorForm, autorunButton, delayInput] =
    ['form-source', 'form-output', 'form-error', 'input-autorun', 'input-delay']
      .map(x => document.getElementById(x));
  sourceForm.value = localStorage.getItem('last_run');

  let timeout;
  sourceForm.addEventListener('input', () => {
    if (autorunButton.checked) {
      clearTimeout(timeout);
      timeout = setTimeout(run, delayInput.value);
    }
  });
  run();
}

function run() {
  console.clear();
  let code = sourceForm.value;
  try {
    let mainExp = parse(code);
    let output = [];
    let env = extendEnvWithVarList([], [], buildBasedEnv());
    for (let exp of mainExp) {
      evalLisp(exp, env, value => {
        if (value !== LispVoidObj) {
          console.log(value);
          output.push(value.toString());
        }
      });
    }
    outputForm.value = output.join('\n');
    errorForm.value = null;
  }
  catch (err) {
    outputForm.value = null;
    if (err instanceof LispError) {
      errorForm.value = err.message;
    } else if (err instanceof ParseError) {
      errorForm.value = `Error in parse: ${err.message}`;
    } else {
      errorForm.value = `Error in JavaScript: ${err.message}`;
    }
    throw err;
  }
  finally {
    localStorage.setItem('last_run', code);
  }
}

function saveFile() {
  const content = sourceForm.value;
  let defaultFilename = `${content}\n`
    .match(/.*(?=\n)/)?.[0]
    ?.match(/(?<=;).*/)?.[0];
  if (defaultFilename)
    defaultFilename += '.scm';
  let filename = prompt('文件名', defaultFilename);
  if (filename === null)
    return;
  if (filename === '')
    filename = `code_${Date.now()}.lisp`;

  const eleLink = document.createElement('a');
  eleLink.download = filename;
  eleLink.style.display = 'none';
  const blob = new Blob([content]);
  eleLink.href = URL.createObjectURL(blob);
  document.body.appendChild(eleLink);
  eleLink.click();
  document.body.removeChild(eleLink);
};

function loadFile() {
  const inputEle = document.createElement('input');
  inputEle.type = 'file';
  inputEle.onchange = () => {
    const reader = new FileReader();
    reader.onload = () => sourceForm.value = reader.result;
    reader.readAsText(inputEle.files[0]);
  }
  inputEle.click();
}

function out(x) {
  console.log(x);
  return x;
}
