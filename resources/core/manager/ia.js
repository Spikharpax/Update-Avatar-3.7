'use strict';
var _ = require("underscore");

var init = function(){
	require('babel-register');  // Ah babel quand tu nous tiens...
	require('../ia').intent();
	return iaManager;
}

var action = function(sentence, client, callback){

	var ia = require('../ia');
	info(sentence, 'From:', client);

	// Avatar 3.0
	if (Config.interface && client != 'TranslateByInterface') {
		var mapped = _.find(Config.default.mapping, function(num){
		  return client == num.split(',')[0];
		});
		Avatar.Interface.logSpeak(client, 0, sentence, Config.interfaceSpeak_timer, ((mapped) ? true : false));
	}

    ia.listen( sentence, client, function (state) {
				if (!state) {
					Avatar.Speech.end(client);
					return error("No action...");
				}

				state.client = client;
				// pure forme... not mandatory
				state.isIntent = false;
				if (state.action) {

					// Avatar 3.0
					if (client == 'TranslateByInterface') {
						callback(state.action);
						return;
					}

					// Add sentence to XML grammar of current client
					// **********  Removed - Avatar 3.5  ***************
					/* if (!Config.NoXMLGrammar && !state.action.norule && !Avatar.isMobile(client)) {
						if (state.action.module && !Config.modules[state.action.module].NoXMLGrammar) {
							var clientSocket = Avatar.Socket.getClientSocket(client);
							if (clientSocket)
									clientSocket.emit('add_grammar', sentence);
						}
					} */

					// module + tts
					if (state.action.module && state.action.tts && state.action.value) {
						return Avatar.speak(state.action.value,client,function() {
							if (callback) info('Run with ia Callback');
							if (!state.action.no_end) {
									Avatar.Speech.end(client, true, function (){
										Avatar.run(state.action.module, state, callback);
									});
							} else
									Avatar.run(state.action.module, state, callback);
						});
					}
					// module seul
					if (state.action.module) {
						if (callback) info('Run with ia Callback');
						return Avatar.run(state.action.module, state, callback);
					}
					// tts seul
					if (state.action.tts && state.action.value) {
						return Avatar.speak(state.action.value,client,function() {
							if (!state.action.no_end) Avatar.Speech.end(client);
						});
					}
					// rien...
					if (state.action.norule) {
						return Avatar.speak(state.action.value,client,function() {
								var clientSocket = Avatar.Socket.getClientSocket(client);
							  if (clientSocket) clientSocket.emit('listen_again');
						});
					}
				}
		}, function(err) {
			Avatar.Speech.end(client);
			if (err) error(err);
		});
}



var clientFromRule = function (sentence, clientSpeech) {
	
	var room;
	var otherClient;
	
	if (clientSpeech) room = clientSpeech;
	
	// cherche si dans la règle il y a le nom d'un client réel
	var clients = Avatar.Socket.getClients();
	var otherClient = _.find(clients, function(client){
			return sentence.toLowerCase().indexOf(client.id.toLowerCase()) != -1;
		});

	if (!otherClient) {
		// cherche si dans la règle il y a le nom d'un client mappé avec le client d'où vient la règle
		otherClient = _.find(Config.default.mapping, function(num){
			return sentence.toLowerCase().indexOf(num.split(',')[0].toLowerCase()) != -1;
		});
		if (!otherClient)
			// cherche si le currentRoom est un client mappé pour capteur de présence
			otherClient = _.find(Config.default.mapping, function(num){
				return Avatar.currentRoom.toLowerCase() == num.split(',')[0].toLowerCase();
			});

		if (otherClient)
			room = otherClient.split(',')[0];
	} else {
		room = otherClient;
	}

	return (room) ? (room.id) ? room.id : room : 'current';

}



var iaManager = {

  'init': init,
  'clientFromRule': clientFromRule,
  'action': action
}


// Exports Config
exports.init = iaManager.init;
