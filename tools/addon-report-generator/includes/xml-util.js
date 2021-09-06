// cleidigh - Utility to get install.rdf values

exports.rdfGetValue = function(file, valuePath) {

	var convert = require('xml-js');
	var xml = require('fs').readFileSync(file, 'utf8');
	var options = { ignoreComment: true, alwaysChildren: true, compact: true };
	var result = convert.xml2js(xml, options); 

	var rdfXMLPath = 'result.RDF.' + valuePath + '._text';
	try {
		if (eval(rdfXMLPath) === undefined || eval(rdfXMLPath) === null) {
			return null;
		}
		//console.log(eval(rdfXMLPath));
	
	} catch (error) {
		return null;
	}
	
	return eval(rdfXMLPath);
}
