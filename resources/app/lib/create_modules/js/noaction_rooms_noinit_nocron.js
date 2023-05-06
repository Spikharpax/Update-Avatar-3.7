/* Méthode principale du plugin
	Params:
	- data: objet state provenant de <plugin>.action.js
		- data.client: Le client qui a passé la règle
	- callback: lien entre plugin (toujours renvoyé en fin de méthode, interne, non utilisé)
*/
exports.action = function(data, callback){

	// Info console
	info("create_module");
	
	//Exemple pour la pièce "Salon"
	var client = "Salon";
	
	// récupération de l'action à exécuter pour la pièce dans le property (Exemple "Salon")
	var action_module = Config.modules.create_module.clients[client];
	
	// Exemple d'action
	//DoStuff("J'exécute une action pour la pièce " + client, action_module);
		
	// Fonction de callback, lien entre plugins (Obligatoire, toujours renvoyé en fin de méthode)
	callback();
 
}

