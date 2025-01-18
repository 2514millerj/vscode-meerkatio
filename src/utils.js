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

module.exports = wrapText;