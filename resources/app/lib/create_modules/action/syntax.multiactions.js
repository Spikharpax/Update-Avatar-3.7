'use strict';

// Ce module vérifie prépare l'objet data envoyé au plugin

Object.defineProperty(exports, "__esModule", {
  value: true
});

let _helpers = require('../../node_modules/ava-ia/lib/helpers');

exports.default = function (state) {
	
	return new Promise(function (resolve, reject) {
		
		for (var rule in Config.modules.create_module.rules) {
			var match = (0, _helpers.syntax)(state.sentence, Config.modules.create_module.rules[rule]); 
			if (match) break;
		}
		
		// Renvoie le client qui a exécuté la règle ou une pièce dans la règle ou une pièce mappée ou par défaut...
		// let room = Avatar.ia.clientFromRule (state.rawSentence, state.client);
		
		setTimeout(function(){ 
			if (state.debug) info('Action create_module');
			
			state.action = {
				module: 'create_module',
				command: rule,
				//room: room, //décommentez si vous initialisez la variable room
				sentence: state.sentence,
				rawSentence: state.rawSentence
			};
			resolve(state);
		}, ((Config.waitAction && Config.waitAction.time) ? Config.waitAction.time : 100));
	});
};



