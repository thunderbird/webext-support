var prefBranchBackEnd = {
	_defaults: {},
	_branch: "",
	
	init: async function (branch, defaults) {
		this._defaults = defaults;
		this._branch = branch;

		// Setup defaults.
		for (const [name, value] of Object.entries(defaults)) {
			await messenger.LegacyPrefs.setDefaultPref(`${this._branch}${name}`, value);
		}
	},

	// Global preference handler, called by WebExtension scripts and Legacy scripts.
	handler: async function (info) {
		switch (info.command) {
		  case "getAllPrefs":
			let preferences = {};
			for (let pref of Object.keys(this._defaults)) {
			  let rv = await messenger.LegacyPrefs.getUserPref(`${this._branch}${pref}`);
			  if (rv != null) preferences[pref] = rv;
			}
			return preferences;
		  
		  case "getAllDefaults":
			return this._defaults;

		  case "getPref":
			return await messenger.LegacyPrefs.getUserPref(`${this._branch}${info.name}`);

		  case "clearPref":
			// inform all listeners of the updated value (in case they use the local cache)
			messenger.WindowListener.notifyExperiment(info);
			messenger.runtime.sendMessage(info).catch(() => { /* hide error in case no receiving end/no listeners */ });
			// update the value in the used preference backend
			return messenger.LegacyPrefs.clearUserPref(`${this._branch}${info.name}`);
			
		  case "setPref":
			// inform all listeners of the updated value (in case they use the local cache)
			messenger.WindowListener.notifyExperiment(info);
			messenger.runtime.sendMessage(info).catch(() => { /* hide error in case no receiving end/no listeners */ });
			// update the value in the used preference backend
			return messenger.LegacyPrefs.setPref(`${this._branch}${info.name}`, info.value);

		  case "setDefault":
			// inform all listeners of the updated value (in case they use the local cache)
			messenger.WindowListener.notifyExperiment(info);
			messenger.runtime.sendMessage(info).catch(() => { /* hide error in case no receiving end/no listeners */ });
			// update the value in the used preference backend
			return messenger.LegacyPrefs.setDefaultPref(`${this._branch}${info.name}`, info.value);
		}
	}
}