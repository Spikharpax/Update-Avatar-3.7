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
   - Permet d'exécuter et d'initialiser:
		- Des propriétés, variables, etc...
		- Une méthode Avatar.listen() 
			- Event à exécuter depuis un autre plugin  
*/
exports.init = function(){
	// Ajoutez içi vos propriétés, fonctions exécutées au chargement du plugin
	
	
}



/* Méthode principale du plugin
	Params:
	- data: objet state provenant de <plugin>.action.js
		- data.client: Le client qui a passé la règle
	- callback: lien entre plugin
*/
exports.action = function(data, callback){

	// Cherche si le nom d'une pièce est présente et est différente du client qui a passé la règle.
	// Par exemple, "Allume la lumière dans le Salon"
	// Si oui, alors client = "Salon" sinon client = data.client 
	// La variable client contiendra donc la pièce où doit être exécutée l'action
	// data.client contiendra la pièce où les réponses d'Avatar seront dites (les speak, les askme).
	let client = setClient(data);
      	
	// Info console
	info("create_module from:", data.client, "To:", client);
	
	// récupération de l'action à exécuter pour la pièce dans le property
	let action_module = Config.modules.create_module.clients[client];
	
	// récupération du tts en relation avec la pièce dans le property
	let tts = Config.modules.create_module.tts[client];
	
	// Exemple exécution d'une action
	doAction(action_module, data.client, client)
	.then(() => speak(tts, data.client))
  	.then (() => {
      	// Remet l'écoute sur le client
		// C'est un exemple pour faire quelque chose...
		// Sinon le Speech.end peut être fait en callback du speak directement
        Avatar.Speech.end(data.client);
    })
    .catch(() => {
      // Remet l'écoute sur le client si erreur
	  error('Une erreur est survenue');
      Avatar.Speech.end(data.client);
    });
  	
	// Fonction de callback, lien entre plugins (Obligatoire, toujours renvoyé en fin de méthode)
	callback();
 
}




function doAction(action_module, clientFrom, clientTo) {
	
	return new Promise((resolve, reject) => {
      	// Do stuff...
		Avatar.speak("J'exécute l'actionneur " + action_module + " pour la pièce " + clientTo, clientFrom, () => {
			resolve();
		});
    });
	
}



// Methode exemple
function speak (tts, client) {
  
    return new Promise((resolve, reject) => {
      	// Vocalise un message sur le client
        Avatar.speak(tts, client, () => {
			// Resolve le Promise dans le callback du speak
			resolve();
        });
		
    });
  
}




// Méthode de recherche du client où l'action doit être exécutée.
function setClient (data) {

	// Init de la variable avec data.client (le client qui a passé la règle)
	let client = data.client;
	
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