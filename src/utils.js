function wrapText(text, maxCharsPerLine) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        // Check if adding this word would exceed the max length
        if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
            // Add word to current line
            currentLine += (currentLine.length > 0 ? ' ' : '') + word;
        } else {
            // Start a new line
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
            // If the word itself is longer than maxCharsPerLine, split it
            if (word.length > maxCharsPerLine) {
                let remainingWord = word;
                while (remainingWord.length > 0) {
                    lines.push(remainingWord.slice(0, maxCharsPerLine));
                    remainingWord = remainingWord.slice(maxCharsPerLine);
                }
                currentLine = '';
            } else {
                currentLine = word;
            }
        }
    }

    // Don't forget the last line
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return lines.join('\n');
}

// Borrowed and adapter from https://github.com/joshuatz/nodejs-child-process-testing/blob/main/persistent-shell.js
const getShellProc = (shell) => {
	let shellFile = '/bin/sh';
	if (process.platform === 'win32') {
		shellFile = process.env.comspec || 'cmd.exe';
	} else if (process.platform === 'android') {
		shellFile = '/system/bin/sh'
	}

	shellFile = shell || shellFile;

	// Spawn the proc and return
	return require('child_process').spawn(shellFile, {
		shell: false,
	});
}

const getPersistentShell = (shell) => {
	const shellProc = getShellProc(shell);
	/** @type {string[]} */
	let chunks = [];
	const dataListeners = [];
	const errorListeners = [];
	const exitListeners = [];

	shellProc.stdout.on('data', data => {
		data = data.toString();
		chunks.push(data);
		dataListeners.forEach(f => f(data));
	});
	shellProc.on('exit', exitCode => {
		if (exitCode === 0) {
			exitListeners.forEach(f => f(chunks.join('')));
		} else {
			errorListeners.forEach(f => f(chunks.join('')));
		}
	});
	shellProc.on('error', err => errorListeners.forEach(f => f(err)));

	const awaitableResult = new Promise((res, rej) => {
		errorListeners.push(rej);
		exitListeners.push(res);
	});

	/**
	 * Execute a command
	 * @param {string} cmd
	 * @param {number} dataLength
	 */
	const execCmd = async (cmd, dataLength = 1, capture = true) => {
		let result = null;
		if (capture) {
			const cmdResChunks = [];
			result = new Promise((res, rej) => {
				dataListeners.push((data) => {
					cmdResChunks.push(data.toString());
					if (cmdResChunks.length >= dataLength) {
						res(cmdResChunks.join(''));
					}
				});
			});
		}
		cmd = cmd.endsWith('\n') ? cmd : (cmd + '\n');
		shellProc.stdin.write(cmd);
		return result;
	}

	const execCmdWithoutCapture = (cmd, dataLength) => {
		execCmd(cmd, dataLength, false);
		return null;
	}

	return {
		process: shellProc,
		finalResult: awaitableResult,
		execCmd,
		execCmdWithoutCapture
	}
}

module.exports = {
    wrapText,
    getPersistentShell
}