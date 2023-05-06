/* Méthode d'initialisation
   - Exécutée au chargement du plugin
   - Permet d'initialiser:
		- Des propriétés
		- Une méthode Avatar.listen() 
			- Event à exécuter depuis un autre plugin  
*/
exports.init = function(){
	// Ajoutez içi vos propriétés, fonctions exécutées au chargement
	
	
}



/* Méthode principale du plugin
	Params:
	- data: objet state provenant de <plugin>.action.js
		- data.client: Le client qui a passé la règle
	- callback: lien entre plugin (toujours renvoyé en fin de méthode, interne, non utilisé)
*/
exports.action = function(data, callback){

	// Info console
	info("create_module from:", data.client);
	
	// point d'entrée - Méthode à exécuter
	// Exemple avec l'exécution d'une méthode command1
	command1 (data);
	
	// Fonction de callback, lien entre plugins (Obligatoire, toujours renvoyé en fin de méthode)
	callback();
 
}



function command1 (data) {
	
	// récupération du tts en relation avec la pièce dans le property
	var tts = Config.modules.create_module.tts;
	
	// Exemple d'action
	// Remplacez le speak par votre action
	Avatar.speak("J'exécute l'actionneur " + action_module + " pour la pièce " + client, data.client, function(){
		
		// Après l'action je vocalise un message
		Avatar.speak(tts, data.client, function(){
			// Remet l'écoute sur le client après le traitement complet
			Avatar.Speech.end(data.client);
		});
		
	});
	
}