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
	info("create_module");
	
	// Exemple d'action
	//DoStuff("J'exécute une action);
	
	// Fonction de callback, lien entre plugins (Obligatoire, toujours renvoyé en fin de méthode)
	callback();
 
}