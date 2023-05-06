'use strict';

import 'colors';
import Ava from 'ava-ia';

import {lastAction, intentEnd} from './intents';
import {backupAction, actionEnd} from './actions';

var Promise = require('q').Promise;

var ava = new Ava({
	debug: true, // If you want see intents/actions trace log.
});


exports.intent = function () {

	// Finds Intent & Actions linked to plugins
	getPluginIntent()
	.then(cache => getPluginIntents(cache))
	.then(cache => bubbleTree(cache))
	.then(function(cache) {

		// Configure the intents
		for(var i = 0 ; i < cache.length ; i++){
			var pluginIntent = require(cache[i].intent).default;
			var pluginAction;
			if ( cache[i].actions.length == 1) {
				pluginAction = require(cache[i].actions[0]).default;
			} else {
				pluginAction = [];
				for (var a = 0; a < cache[i].actions.length; a++) {
					pluginAction.push(require(cache[i].actions[a]).default);
				}
			}

			ava
			  .intent(pluginIntent,pluginAction)
		}

		// private intents - Do not touch
		ava
		 .intent(lastAction, backupAction)
		 .intent(intentEnd, actionEnd)  // Always at the end ! Checks if a rule has been passed

	});

}



exports.listen = function (sentence, client, resolve, reject) {

	// Ask something
	ava.listen(sentence, client)
	  .then( state => resolve(state))
	  .catch( err => reject(err))

}


var fs   = require('fs-extra');
var _ = require('underscore');
var keys = Object.keys(Config['modules']);

function getPluginIntent () {
	var cache  = [];
	return new Promise(function (resolve, reject) {

		for(var i = 0 ; i < keys.length ; i++){
			var key = keys[i];

			if (Config.modules[key].active == undefined || (Config.modules[key].active != undefined && Config.modules[key].active == true)) {

					var err = false;
					var folder = Avatar.Config.PLUGIN+'/'+key;
					var instance = {actions : []};
					fs.readdirSync(folder).forEach(function(file){
						var path = folder+'/'+file;
						// Directory
						if (!fs.statSync(path).isDirectory()){
							if (file.toLowerCase().startsWith('intent.')){
								if (!instance.intent) {
									//info(key, 'Intent:', file);
									instance.intent = path;
									instance.module = key;
									if (Config.modules[key].nlpPosition && typeof Config.modules[key].nlpPosition === 'number') {
										instance.pos = Config.modules[key].nlpPosition;
									}
								} else {
									error(('Only one Intent file can be defined. Check ' + key + ' plugin folder').red);
									err = true;
								}
							}

							if (file.toLowerCase().startsWith('action.') && !err){
							  //info(key, 'Action:', file);
							  instance.actions.push(path);
							}
						}

					  });

					  if (instance.intent && !err) {
							if (instance.actions && instance.actions.length > 0) {
								cache.push(instance);
							} else {
								error(('No Action file defined for the Intent. Check ' + key + ' plugin folder').red);
							}
					  }

					instance = null;
		 	}
		}

		resolve(cache);
	});
}



function getPluginIntents (cache) {

	return new Promise(function (resolve, reject) {

		for(var i = 0 ; i < keys.length ; i++){
				var key = keys[i];

				if (Config.modules[key].active == undefined || (Config.modules[key].active != undefined && Config.modules[key].active == true)) {

					var folder = Avatar.Config.PLUGIN+'/'+key;

					fs.readdirSync(folder).forEach(function(file){
						var instance = {actions : []};
						var err = false;
						var path = folder+'/'+file;
						// Directory
						if (!fs.statSync(path).isDirectory()){

							if (file.toLowerCase().startsWith('intents.')){
								var posPoint = file.toLowerCase().indexOf('.',9);
								var	intentName = file.toLowerCase().substring(8,posPoint);
								for(var a=0; cache && a < cache.length; a++) {
									if (cache[a].intent.toLowerCase().indexOf(('intents.'+intentName).toLowerCase()) != -1) {
										error(('Only one '+'intents.'+intentName+' Intent file can be defined. Check ' + key + ' plugin folder').red);
										err=true;
										break;
									}
								}

								if (!err) {
									//info(key, 'Intents:', file);
									instance.intent = path;
									instance.module = key;
									if (Config.modules[key].nlpPosition) {
										if (typeof Config.modules[key].nlpPosition === 'number')
											instance.pos = Config.modules[key].nlpPosition;
										else if (typeof Config.modules[key].nlpPosition === 'object') {
											for (var rule in Config.modules[key].nlpPosition) {
												  if (rule.toLowerCase() == intentName.toLowerCase()) {
													    instance.pos = Config.modules[key].nlpPosition[rule];
												        break;
												  }
											}
										}
									}

									fs.readdirSync(folder).forEach(function(nextFile){
										var nextPath = folder+'/'+nextFile;
										if (!fs.statSync(nextPath).isDirectory()){
											if (nextFile.toLowerCase().startsWith(('actions.'+intentName).toLowerCase())) {
												  //info(key, 'Actions:', nextFile);
												  instance.actions.push(nextPath);
											}
										}
									});
								}
							}
						}

						 if (instance.intent && !err) {
							if (instance.actions && instance.actions.length > 0) {
								cache.push(instance);
							} else {
								error(('No Action file defined for the Intent. Check ' + key + ' plugin folder').red);
							}
						  }
						  instance = null;
					 });
				}
		}

		resolve(cache);
	});
}


function bubbleTree (cache) {

	return new Promise(function (resolve, reject) {

		for(var i = 0 ; i < cache.length ; i++){
			for(var a = 1 ; a < cache.length ; a++){
				var tmp = {};
				if(cache[a].pos && cache[a].pos == i + 1 && cache[a].module != cache[i].module) {
					if (cache[a].pos && cache[i].pos && cache[a].pos == cache[i].pos && a != i) {
						warn(('A NLP position is same betwen '+cache[a].module+' and '+cache[i].module+'. Check the problem in property file(s).').yellow);
						continue;
					}

					if (cache[a].pos && cache[i].pos && cache[a].pos == cache[i].pos && a == i) {
						info('Leaving NLP position at',cache[a].pos,'for',cache[a].module,'module.');
						continue;
					}

					warn('Changing NLP',cache[a].module,'module position from', a + 1, 'to', cache[a].pos);

					tmp = cache[i];
					cache[i] = cache[a];
					cache[a] = tmp;
				}
			}
		}

		resolve(cache);
	});
}
