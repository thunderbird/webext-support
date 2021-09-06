/**
 * This script is heavily based on the work of Christopher Leidigh:
 * https://github.com/cleidigh/ThunderKdB/blob/master/scripts/genExtensionList.js
 */

// Debug logging (0 - errors and basic logs only, 1 - verbose debug)
const debugLevel = 0;

const fs = require('fs-extra');

const rootDir = "data";
const reportDir = "reports";
const extsAllJsonFileName = `${rootDir}/xall.json`;

function debug(...args) {
	if (debugLevel > 0) {
		console.debug(...args);
	}
}

function makeBadgeElement(bOpt) {
	return`<img src='${bOpt.badgeBasedURL}/${bOpt.bLeftText}-${bOpt.bRightText}-${bOpt.bColor}.png' title='${bOpt.bTooltip}'>`;
}

// A versioncompare, taken from https://jsfiddle.net/vanowm/p7uvtbor/
function compareVer(a, b) {
	function prep(t) {
		return ("" + t)
			//treat non-numerical characters as lower version
			//replacing them with a negative number based on charcode of first character
			.replace(/[^0-9\.]+/g, function (c) { return "." + ((c = c.replace(/[\W_]+/, "")) ? c.toLowerCase().charCodeAt(0) - 65536 : "") + "." })
			//remove trailing "." and "0" if followed by non-numerical characters (1.0.0b);
			.replace(/(?:\.0+)*(\.-[0-9]+)(\.[0-9]+)?\.*$/g, "$1$2")
			.split('.');
	}

	if (a != "*" && b == "*") return -1;
	if (a == "*" && b != "*") return 1;
	if (a == "*" && b == "*") return 0;

	a = prep(a);
	b = prep(b);
	for (var i = 0; i < Math.max(a.length, b.length); i++) {
		//convert to integer the most efficient way
		a[i] = ~~a[i];
		b[i] = ~~b[i];
		if (a[i] > b[i])
			return 1;
		else if (a[i] < b[i])
			return -1;
	}
	return 0;
}

// Returns the special xpilib object for the given ESR (or current).
function getExtData(extJson, esr) {
	let cmp_data = extJson?.xpilib?.cmp_data;
	let version = cmp_data
		? cmp_data[esr]
		: null;

	let ext_data = extJson?.xpilib?.ext_data;
	let data = version && ext_data
		? ext_data[version]
		: null;

	return { version, data };
}

var reports = [
	{
		name: "report-all",
		header: "All Extensions compatible with TB60 or newer.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let vHighest = getExtData(extJson, "91").version ||
				getExtData(extJson, "78").version ||
				getExtData(extJson, "68").version ||
				getExtData(extJson, "60").version;

			return !!vHighest;
		},
	},
	{
		name: "report-all-with-parsing-error",
		header: "Extensions whose XPI files could not be parsed properly and are excluded from analysis.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let current_version = getExtData(extJson, "current").data;
			return !current_version;
		}
	},
	{
		name: "report-all-recent-activity",
		header: "Extensions updated within the last 2 weeks.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let current_version = getExtData(extJson, "current").data;
			if (current_version) {
				let c = current_version.atn.files[0].created;
				let cv = new Date(c);
				let today = new Date();
				const msDay = 24 * 60 * 60 * 1000;
				let d = (today - cv) / msDay;
				return (d <= 14);
			}
			return false;
		}
	},
	{
		name: "report-all-wrong-order",
		header: "Extension with wrong upper limit setting in older versions, which will lead to the wrong version reported compatible by ATN.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let v91 = getExtData(extJson, "91").version;
			let v78 = getExtData(extJson, "78").version;
			let v68 = getExtData(extJson, "68").version;
			let v60 = getExtData(extJson, "60").version;

			if (v60 && v68 && compareVer(v60, v68) > 0) return true;
			if (v60 && v78 && compareVer(v60, v78) > 0) return true;
			if (v60 && v91 && compareVer(v60, v91) > 0) return true;

			if (v68 && v78 && compareVer(v68, v78) > 0) return true;
			if (v68 && v91 && compareVer(v68, v91) > 0) return true;

			if (v78 && v91 && compareVer(v78, v91) > 0) return true;

			return false;
		},
	},
	{
		name: "report-all-experiments-atn-value-reduced-below-xpi",
		header: "Extensions whose max version has been reduced in ATN below the XPI value (which is ignored during install and app upgrade).",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let vCurrent = getExtData(extJson, "current").data;
			if (!vCurrent)
				return false;

			let atn_max = vCurrent?.atn?.compatibility?.thunderbird?.max || "*";
			let strict_max = vCurrent.manifest?.applications?.gecko?.strict_max_version ||
			vCurrent.manifest?.browser_specific_settings?.gecko?.strict_max_version ||
				"*";

			return vCurrent.mext && vCurrent.experiment && (compareVer(strict_max, atn_max) > 0)
		}
	},
	{
		name: "report-all-latest-current-mismatch",
		header: "Extensions, where the latest upload is for an older release, which will fail to install in current ESR (current = defined current in ATN) from within the add-on manager.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let vHighest = getExtData(extJson, "91").version ||
				getExtData(extJson, "78").version ||
				getExtData(extJson, "68").version ||
				getExtData(extJson, "60").version;

			let vCurrent = getExtData(extJson, "current").version;
			return !!vHighest && vHighest != vCurrent;
		},
	},
	{
		name: "report-all-without-upper-limit",
		header: "Extensions without upper limit in ATN (excluding Experiments). This should list only pure MailExtension.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let data = getExtData(extJson, "current").data;
			let atn_max = data?.atn?.compatibility?.thunderbird?.max || "*";
			return !!data && !data.experiment && atn_max == "*";
		}
	},

	// -- As seen by ATN ---------------------------------------------------------------------------
	{
		name: "report-atn-tb60",
		header: "Extensions compatible with Thunderbird 60 as seen by ATN.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			return !!(getExtData(extJson, "60").version);
		},
	},
	{
		name: "report-atn-tb68",
		header: "Extensions compatible with Thunderbird 68 as seen by ATN.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			return !!(getExtData(extJson, "68").version);
		}
	},
	{
		name: "report-atn-tb78",
		header: "Extensions compatible with Thunderbird 78 as seen by ATN.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			return !!(getExtData(extJson, "78").version);
		}
	},
	{
		name: "report-atn-tb91",
		header: "Extensions compatible with Thunderbird 91 as seen by ATN.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			return !!(getExtData(extJson, "91").version);
		}
	},
	// -- Extension with obvious wrong upper limits --------------------------------------------
	{
		name: "report-false-positives-tb68",
		header: "Extensions claiming to be compatible with Thunderbird 68, but are legacy extensions and therefore unsupported.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let data = getExtData(extJson, "68").data;
			return !!data && data.legacy && !data.mext;
		}
	},
	{
		name: "report-false-positives-tb78",
		header: "Extensions claiming to be compatible with Thunderbird 78, but are legacy extensions or legacy WebExtensions and therefore unsupported.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let data = getExtData(extJson, "78").data;
			return !!data && data.legacy;
		}
	},
	// -- Lost extensions (only useful if all false positives have been removed) -------------------
	{
		name: "report-lost-tb60-to-tb68",
		header: "Extensions which have been lost from TB60 to TB68.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let v68 = getExtData(extJson, "68").version;
			let v60 = getExtData(extJson, "60").version;
			return !!v60 && !v68;
		}
	},
	{
		name: "report-lost-tb68-to-tb78",
		header: "Extensions which have been lost from TB68 to TB78.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let v78 = getExtData(extJson, "78").version;
			let v68 = getExtData(extJson, "68").version;
			return !!v68 && !v78;
		}
	},
	{
		name: "report-lost-tb78-to-tb91",
		header: "Extensions which have been lost from TB78 to TB91.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let v91 = getExtData(extJson, "91").version;
			let v78 = getExtData(extJson, "78").version;
			return !!v78 && !v91;
		}
	},
	// -- Specials v91 -----------------------------------------------------------------------------
	{
		name: "report-tb91-pure-mx-incompatible",
		header: "[TB91] Pure MailExtensions, marked incompatible with TB91, which they probably are not.",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let v78 = getExtData(extJson, "78").data;
			let v91 = getExtData(extJson, "91").data;
			return !!v78 && !v91 && v78.mext && !v78.experiment && !v78.legacy
		}
	},
	{
		name: "report-tb91-experiments-without-upper-limit",
		header: "[TB91] Experiments without upper limit in ATN, which might not be compatible with TB91 (excluding reported positives).",
		template: "report-template.html",
		enabled: true,
		filter: function (extJson) {
			let knownToWork = `4631
			15102
			711780
			640
			4654
			773590
			634298
			47144
			195275
			986258
			986325
			54035
			986338
			386321
			987716
			708783
			2533
			3254
			702920
			4970
			986685
			438634
			217293
			1556
			1279
			987798
			987783
			472193
			902
			330066
			12018
			56935
			987934
			646888
			742199
			12802
			987727
			987740
			367989
			11646
			2874
			987900
			987726
			2561
			986682
			769143
			1392
			987775
			331666
			987787
			787632
			3492
			987779
			987796
			690062
			546538
			986610
			559954
			986632
			852623
			987665
			986523`.split("\n").map(e => e.trim());

			let v91 = getExtData(extJson, "91").data;
			let atn_max = v91?.atn?.compatibility?.thunderbird?.max || "*";
			let atn_min = v91?.atn?.compatibility?.thunderbird?.min || "*";
			return !knownToWork.includes(`${extJson.id}`) && !!v91 && v91.mext && v91.experiment && compareVer("90", atn_min) > 0 && atn_max == "*";

		}
	},
]

function genReport(extsJson, report) {
	let extsListFile = fs.readFileSync(report.template, 'utf8');
	let extRows = "";
	let rows = 0;

	extsJson.map((extJson, index) => {
		debug('Extension ' + extJson.id + ' Index: ' + index);

		if (extJson === null) {
			return "";
		}

		if (extJson.xpilib === undefined) {
			console.error('Error, xpilib data missing: ' + extJson.slug);
			extJson.xpilib = {};
		}
		extJson.xpilib.rank = index + 1;

		if (report.filter === null || report.filter(extJson)) {
			let row = createExtMDTableRow(extJson);
			if (row != "") {
				rows++;
			}
			extRows += row;
		} else {
			debug('Skip ' + extJson.slug);
		}
	})

	// Replace these first, as they can introduce those listed below.
	extsListFile = extsListFile.replace('__header__', report.header);
	extsListFile = extsListFile.replace('__description__', report.description);

	extsListFile = extsListFile.replace('__count__', rows);
	let today = new Date().toISOString().split('T')[0];
	extsListFile = extsListFile.replace('__date__', today);
	extsListFile = extsListFile.replace('__table__', extRows);
	fs.ensureDirSync(`${reportDir}`);
	fs.writeFileSync(`${reportDir}/${report.name}.html`, extsListFile);

	debug('Done');
}

function genIndex(index) {
	let extsListFile = fs.readFileSync("index-template.html", 'utf8');
	let today = new Date().toISOString().split('T')[0];
	extsListFile = extsListFile.replace('__date__', today);
	extsListFile = extsListFile.replace('__index__', index);
	fs.ensureDirSync(`${reportDir}`);
	fs.writeFileSync(`${reportDir}/index.html`, extsListFile);
}

function createExtMDTableRow(extJson) {
	let default_locale = extJson.default_locale;
	if (default_locale === undefined) {
		if (typeof extJson.name["en-US"] === 'string') {
			default_locale = "en-US";
		} else {
			let locales = Object.keys(extJson.name);
			default_locale = extJson.name[locales[0]];
		}
	} else {
		if (typeof extJson.name["en-US"] !== 'string') {
			let locales = Object.keys(extJson.name);
			default_locale = locales[0];
		}
	}

	const idSlug = `${extJson.id}-${extJson.slug}`;
	const name_link = `<a id="${idSlug}" href="${extJson.url}">${extJson.name[default_locale].substr(0, 38)}</a>`;
	debug("SLUG", idSlug);

	let rank = extJson.xpilib.rank;
	let current_version = getExtData(extJson, "current").data;
	let v_min = current_version?.atn.compatibility.thunderbird.min || "*";
	let v_max = current_version?.atn.compatibility.thunderbird.max || "*";
	let v_strict_max = current_version?.manifest?.applications?.gecko?.strict_max_version ||
		current_version?.manifest?.browser_specific_settings?.gecko?.strict_max_version ||
		"*";

	// Helper function to return the version cell for a given ESR
	const cv = (esr) => {
		let rv = [];
		let { version, data } = getExtData(extJson, esr);

		if (version) {
			rv.push(version);
		}

		if (data) {
			let cBadge_type_setup = { bLeftText: 'T', bRightText: 'MX', bColor: 'purple', bTooltip: "Extension Type:", badgeBasedURL: 'https://img.shields.io/badge/' };
			let cBadge_legacy_setup = { bLeftText: 'L', bRightText: '+', bColor: 'green', bTooltip: "Legacy Type:", badgeBasedURL: 'https://img.shields.io/badge/' };
			let cBadge_experiment_setup = { bLeftText: 'E', bRightText: '+', bColor: 'blue', bTooltip: 'Experiment APIs: ', badgeBasedURL: 'https://img.shields.io/badge/' };

			if (data.mext == true) {
				cBadge_type_setup.bRightText = "MX"
				cBadge_type_setup.bTooltip += "&#10; - MX : MailExtension (manifest.json)";
			} else {
				cBadge_type_setup.bRightText = "RDF";
				cBadge_type_setup.bTooltip += "&#10; - RDF : Legacy (install.rdf)";
			}
			rv.push(makeBadgeElement(cBadge_type_setup));

			if (data.legacy == true) {
				if (data.legacy_type == 'xul') {
					cBadge_legacy_setup.bRightText = "RS"
					cBadge_legacy_setup.bTooltip += "&#10; - RS : Legacy, Requires Restart";
				} else {
					cBadge_legacy_setup.bRightText = "BS"
					cBadge_legacy_setup.bTooltip += "&#10; - RS : Legacy, Bootstrap";
				}
				rv.push(makeBadgeElement(cBadge_legacy_setup));
			}

			if (data.experiment) {
				if (data.experimentSchemaNames.includes("WindowListener")) {
					cBadge_experiment_setup.bRightText = "WL"
				} else if (data.experimentSchemaNames.includes("BootstrapLoader")) {
					cBadge_experiment_setup.bRightText = "BL"
				}

				let schema = data.experimentSchemaNames;
				if (schema) {
					cBadge_experiment_setup.bTooltip += "&#10;";
					let max = Math.min(schema.length, 14);
					for (let index = 0; index < max; index++) {
						const element = schema[index];
						cBadge_experiment_setup.bTooltip += (element + "&#10;");
					};

					if (data.experimentSchemaNames.length > 15) {
						cBadge_experiment_setup.bTooltip += "&#10;...";
					}
				}
				rv.push(makeBadgeElement(cBadge_experiment_setup));
			}
		}

		return rv.join("<br>");
	}

	return `
	<tr>
	  <th style="text-align: right" valign="top">${rank}</th>
	  <th style="text-align: right" valign="top">${extJson.id}</th>
	  <th style="text-align: left"  valign="top">${name_link}</th>
	  <th style="text-align: right" valign="top">${extJson.average_daily_users}</th>
	  <th style="text-align: right" valign="top">${cv("60")}</th>
	  <th style="text-align: right" valign="top">${cv("68")}</th>
	  <th style="text-align: right" valign="top">${cv("78")}</th>
	  <th style="text-align: right" valign="top">${cv("91")}</th>
	  <th style="text-align: right" valign="top">${current_version?.atn.files[0].created.split('T')[0]}</th>
	  <th style="text-align: right" valign="top">${cv("current")}</th>
	  <th style="text-align: right" valign="top">${v_min}</th>
	  <th style="text-align: right" valign="top">${v_max}</th>
	  <th style="text-align: right" valign="top">${v_strict_max}</th>
	</tr>`;
}

console.log('Generating reports...');
let extsJson = fs.readJSONSync(extsAllJsonFileName);
let index = [];
for (let report of reports) {
	if (report.enabled) {
		console.log("  -> " + report.name);
		genReport(extsJson, report);
		index.push(`<p><a href="${report.name}.html">${report.name}</a></p><blockquote><p>${report.header}</p></blockquote>`);
	}
}
genIndex(index);