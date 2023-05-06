'use strict';

// Ce module vérifie prépare l'objet data envoyé au plugin

Object.defineProperty(exports, "__esModule", {
  value: true
});


exports.default = function (state) {
	
	return new Promise(function (resolve, reject) {
		
		// vérifie le tableau de règles du plugin
		var token;
		for (var rule in Config.modules.create_module.rules) {	 
			token = (0, _helpers.intersect)(Config.modules.create_module.rules, state.tokens);	
			if (token) break;
		}
		
		// Renvoie le client qui a exécuté la règle ou une pièce dans la règle ou une pièce mappée ou par défaut...
		// let room = Avatar.ia.clientFromRule (state.rawSentence, state.client);
		
		setTimeout(function(){ 
			if (state.debug) info('Action create_module');
			
			state.action = {
				module: 'create_module',
				command: rule,
				token: token,
				//room: room, //décommentez si vous initialisez la variable room
				sentence: state.sentence,
				rawSentence: state.rawSentence
			};
			resolve(state);
		}, ((Config.waitAction && Config.waitAction.time) ? Config.waitAction.time : 100));	
		
	});
};



