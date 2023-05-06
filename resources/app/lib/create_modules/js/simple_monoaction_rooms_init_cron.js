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
	- callback: fonction de lien entre plugin
*/
exports.action = function(data, callback){
	
	// Cherche si le nom d'une pièce est présente et est différente du client qui a passé la règle.
	// Par exemple, "Allume la lumière dans le Salon"
	// Si oui, alors client = "Salon" sinon client = data.client 
	// La variable client contiendra donc la pièce où doit être exécutée l'action
	// data.client contiendra la pièce où les réponses d'Avatar seront dites (les speak, les askme).
	var client = setClient(data);
	
	// Info console
	info("create_module from: " + data.client + " To: " + client);
	
	// récupération du tts en relation avec la pièce dans le property
	var tts = Config.modules.create_module.tts[client];
	
	// Exemple d'action
	// Remplacez le speak par votre action
	Avatar.speak("J'exécute l'actionneur pour la pièce " + client, data.client, function(){
		
		// Après l'action je vocalise un message
		Avatar.speak(tts, data.client, function(){
			// Remet l'écoute sur le client après le traitement complet
			Avatar.Speech.end(data.client);
		});
		
	});
			
	// Fonction de callback
	callback();
 
}





// Méthode de recherche du client où l'action doit être exécutée.
function setClient (data) {

	// Init de la variable avec data.client (le client qui a passé la règle)
	var client = data.client;
	
	// Test si une pièce est ajoutée dans la règle.
	// Défini par la méthode Avatar.ia.clientFromRule du <plugin>.actions.js
	// Peut retourner 'current' pour la pièce courante
	if (data.action.room)
		client = (data.action.room != 'current') ? data.action.room : (Avatar.currentRoom) ? Avatar.currentRoom : Config.default.client;

	// Peut provenir d'une commande HTTP où un paramètre "setRoom" est défini avec le nom d'une pièce
	if (data.action.setRoom)
		client = data.action.setRoom;
	
	// On peut ajouter d'autres tests suivant d'autres paramètres provenant d'autres sources...
	// if (data.action.<autre param>)
	//	client = data.action.<autre param>


	// Retourne le nom de la pièce où l'action doit être exécutée.
	return client;
}