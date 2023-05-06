'use strict';

// Ce module vérifie prépare l'objet data envoyé au plugin

Object.defineProperty(exports, "__esModule", {
  value: true
});


exports.default = function (state) {
	
	return new Promise(function (resolve, reject) {
		
		// Renvoie le client qui a exécuté la règle ou une pièce dans la règle ou une pièce mappée ou par défaut...
		// let room = Avatar.ia.clientFromRule (state.rawSentence, state.client);
		
		setTimeout(function(){ 
			if (state.debug) info('Action create_module');
			
			state.action = {
				module: 'create_module',
				//room: room, //décommentez si vous initialisez la variable room
				sentence: state.sentence,
				rawSentence: state.rawSentence
			};
			resolve(state);
		}, ((Config.waitAction && Config.waitAction.time) ? Config.waitAction.time : 100));	
		
	});
};



