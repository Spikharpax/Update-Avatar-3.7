/* Méthode principale du plugin
	Params:
	- data: objet state provenant de <plugin>.action.js
		- data.client: Le client qui a passé la règle
	- callback: lien entre plugin (toujours renvoyé en fin de méthode, interne, non utilisé)
*/
exports.action = function(data, callback){
	
	// Info console
	info("create_module from: " + data.client);
	
	// récupération du tts en relation avec la pièce dans le property
	var tts = Config.modules.create_module.tts;
	
	// Exemple d'action
	// Remplacez le speak par votre action
	Avatar.speak("J'exécute l'actionneur pour la pièce " + data.client, data.client, function(){
		
		// Après l'action je vocalise un message
		Avatar.speak(tts, data.client, function(){
			// Remet l'écoute sur le client après le traitement complet
			Avatar.Speech.end(data.client);
		});
		
	});
			
	// Fonction de callback
	callback();
 
}