const vscode = require('vscode'); 

async function notebookWatcher(context) {
	vscode.workspace.onDidChangeNotebookDocument((event) => {
		for(let cell of event.cellChanges) {
			if (cell.executionSummary?.timing) {
				//Cell Execution Completed When "timing" is available
				let startTime = new Date(cell.executionSummary.timing.startTime);
				let endTime = new Date(cell.executionSummary.timing.endTime);
				let message = `
                    Cell #${cell.cell.index} in notebook ${event.notebook.uri.path.split("/").pop()} ${cell.executionSummary.success ? "Completed Successfully" : "Execution Failed"}
                    
                    Start Time: ${startTime}
                    End Time: ${endTime}
                `;
				
                vscode.window.showInformationMessage(message);
			}
		}
	});
}
 

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	//start async Jupyter notebook watcher for when a user opens new notebooks
	notebookWatcher(context);
}


// This method is called when your extension is deactivated
function deactivate() {}


module.exports = {
	activate,
	deactivate
}