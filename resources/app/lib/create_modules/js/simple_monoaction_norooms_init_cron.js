/* Méthode d'initialisation d'un crontab
   - Exécutée au chargement du plugin
   - Permet d'exécuter quelque chose à intervalle régulier 
   - Le cron est défini par un objet cron dans les propriétés du plugin
   ***************************************************************
   - Par défaut, réglé toutes les 2 heures à la création du plugin
   - REGLEZ VOTRE CRON MAINTENANT DANS LE FICHIER DE PROPRIETES !!
   ***************************************************************
*/
exports.cron = function(data){
	// Ajoutez içi ce qui est exécuté par le cron
	
	
}



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
	- callback: lien entre plugin
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