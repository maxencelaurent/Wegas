/**
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */

YUI.add('wegas-datasourcerest', function (Y) {
    "use strict";

    var Lang = Y.Lang,
    DataSourceREST,
    VariableDescriptorDataSourceREST,
    GameModelDataSourceREST,
    GameDataSourceREST,
    DEFAULTHEADERS = {
        'Content-Type': 'application/json; charset=utf-8',
        'Managed-Mode': 'true'
    };

    DataSourceREST = function () {
        DataSourceREST.superclass.constructor.apply(this, arguments);
    };

    Y.mix(DataSourceREST, {
        NS: "rest",
        NAME: "DataSourceREST"
    });

    Y.extend(DataSourceREST, Y.Plugin.Base, {

        initializer: function () {
            this.doBefore("_defResponseFn", this.beforeResponse, this);
            this.get('host').data = [];
        },

        sendRequest: function (requestCfg) {
            requestCfg.callback = requestCfg.callback || {
                success: this._successHandler,
                failure: this._failureHandler
            };
            requestCfg.cfg = requestCfg.cfg || {};
            requestCfg.cfg.headers =  requestCfg.cfg.headers || DEFAULTHEADERS;

            this.get('host').sendRequest(requestCfg);
        },


        beforeResponse: function (e) {
            Y.log("Response received from " + this.get('host').get('source')/* + e.cfg.request*/, "info", "Wegas.RestDataSource");
            e.data = this.getEntities();
            e.serverResponse = Y.Wegas.persistence.Entity.revive(e.response.results);

            if (Lang.isArray(e.serverResponse)) {
                for (i = 0; i < e.serverResponse.length; i += 1) {
                    this.applyOperation(e.cfg.method, e.serverResponse[i], this.getEntities());
                }
            } else {
                for (i = 0; i < e.serverResponse.get("entities").length; i += 1) {       // Update the cache with the Entites in the reply body
                    this.applyOperation(e.cfg.method, e.serverResponse.get("entities")[i], this.getEntities());
                }

                for (i = 0; i < e.serverResponse.get("events").length; i += 1) {
                    evt = e.serverResponse.get("events")[i];
                    if (evt.get('@class') == "EntityUpdatedEvent") {
                        for (i = 0; i < evt.updatedEntities.length; i += 1) {         // Update the cache with the entites in the reply
                            this.applyOperation("POST", evt.updatedEntities[i], this.getEntities());
                        }
                    }
                }
            }

        },
        lookupAndFn: function(method, needle, stack) {

        },
        lookupAndDo: function(method, needle, stack) {
            var id;
            for (i = 0; i < stack.length; i += 1) {
                if (( stack[i].get ) ? stack[i].get("id") === needle.get("id") :
                    stack[i].id === needle.id) {
                    switch (method) {
                        case "DELETE":
                            stack.splice(i, 1);
                            return true;
                        default:
                            stack[i].setAttrs(needle.getAttrs());
                            return true;
                    }
                }
                if (stack[i].items) {
                    if (this.lookupAndDo(method, needle, stack[i].items)) {
                        return true;
                    }
                }
            }
            return false;
        },

        applyOperation: function (method, needle, stack) {
            if (!this.lookupAndDo(method, needle, stack)) {
                stack.push(needle);
            };
        },

        getEntities: function () {
            return this.get('host').data;
        },

        getEntityBy: function (key, val) {
            var entities = this.getEntities(), i;
            for (i in entities) {                                              // We first check in the cache if the data is available
                if (entities.hasOwnProperty(i) && entities[i][key] === val) {
                    return entities[i];
                }
            }
            return null;
        },
        getEntitiesBy: function (key, val) {
            var host = this.get('host'), ret = [], i;
            for (i in host.data) {                                              // We first check in the cache if the data is available
                if (host.data.hasOwnProperty(i) && host.data[i][key] === val) {
                    ret.push(host.data[i]);
                }
            }
            return ret;
        },
        getEntityById: function (id) {
            return this.getEntityBy("id", id  * 1);                     // Cast to number
        },

        /**
         * @deprecated, here for retrocompatibility
         */
        getCachedVariableBy: function (key, val) {
            Y.log("Function getCachedVariableBy() is deprecated, use getEntityBy(key, val)");
            return this.getEntityBy(key, val);
        },
        getCachedVariablesBy: function (key, val) {
            Y.log("Function getCachedVariableBy() is deprecated, use getEntitiesBy(key, val)");
            return this.getEntitiesBy(key, val);
        },
        getCachedVariableById: function (id) {
            Y.log("Function getCachedVariableById() is deprecated, use getEntityById(key, val)");
            return this.getEntityById(id);                     // Cast to number
        },



        generateRequest: function (data) {
            return "/" + data.id;
        },

        post: function (data, parentData, callback) {

            var request = (parentData) ? "/" + parentData.id + "/" + data["@class"] : "/";

            this.sendRequest({
                request: request,
                cfg: {
                    method: "POST",
                    data: Y.JSON.stringify(data)
                },
                callback: callback
            });
        },

        getObject: function (data) {
            this.sendRequest(this.generateRequest(data));
        },
        put: function (data, callback) {
            this.sendRequest({
                request: this.generateRequest(data),
                cfg: {
                    method: "PUT",
                    data: Y.JSON.stringify(data)
                },
                callback: callback
            });
        },
        deleteObject: function (data) {
            this.sendRequest({
                request: this.generateRequest(data),
                cfg: {
                    method: "DELETE"
                }
            });
        },
        _successHandler: function (e) {
            Y.log("Datasource reply:" + e.response, 'log', 'Y.Wegas.DataSourceRest');
        },
        _failureHandler: function (e) {
            console.log("DataSourceRest._failureHandler", e);
            Y.log("Datasource reply:" + e, 'log', 'Y.Wegas.DataSourceRest');
        // alert("Error sending REST post request!");
        }

    });

    Y.namespace('Plugin').DataSourceREST = DataSourceREST;

    VariableDescriptorDataSourceREST = function () {
        VariableDescriptorDataSourceREST.superclass.constructor.apply(this, arguments);
    };

    Y.mix(VariableDescriptorDataSourceREST, {
        NS: "rest",
        NAME: "VariableDescriptorDataSourceREST"
    });

    Y.extend(VariableDescriptorDataSourceREST, DataSourceREST, {

        applyOperation: function (method, needle, stack) {
            if (needle.get("@class").indexOf("Instance") !== -1) {
                instances = this.getCachedVariableById(cEl["descriptorId"]).scope.variableInstances;
                for (k in instances) {
                    if (instances.hasOwnProperty(k) && instances[k].id === cEl.id) {
                        instances[k] = Y.merge(instances[i], cEl);
                    }
                };
            } else if (!this.lookupAndDo(method, needle, stack)) {
                stack.push(needle);
            };
        },

        getCachedVariableBy: function (key, val) {
            function getCachedVariableByInner(variables) {
                var i, ret;
                for (i in variables) {                                              // We first check in the cache if the data is available
                    if (variables.hasOwnProperty(i)) {
                        if (variables[i][key] === val) {
                            return variables[i];
                        }
                        if (variables[i].items) {
                            ret = getCachedVariableByInner(variables[i].items);
                            if (ret) {
                                return ret;
                            }
                        }

                    }
                }
                return null;
            }
            return getCachedVariableByInner(this.get("host").data);
        },
        put: function (data, callback) {
            if (data['@class'].indexOf("Instance") !== -1) {
                this.sendRequest({
                    request: '/1/VariableInstance/' + data.id,
                    cfg: {
                        method: "PUT",
                        data: Y.JSON.stringify(data)
                    },
                    callback: callback
                });
                return;
            } else {
                VariableDescriptorDataSourceREST.superclass.put.call(this, data, callback);
            }
        },
        post: function (data, parentData, callback) {
            var request = "";
            if (parentData) {
                switch (parentData["@class"]) {
                    case "ListDescriptor":
                    case "QuestionDescriptor":
                        request = "/ListDescriptor/" + parentData.id;
                        break;
                    default:
                        request = "/" + parentData.id + "/VariableInstance/";
                        break;
                }
            }
            this.sendRequest({
                request: request,
                cfg: {
                    method: "POST",
                    data: Y.JSON.stringify(data)
                },
                callback: callback
            });
        }
    });

    Y.namespace('Plugin').VariableDescriptorDataSourceREST = VariableDescriptorDataSourceREST;


    GameModelDataSourceREST = function () {
        GameModelDataSourceREST.superclass.constructor.apply(this, arguments);
    };

    Y.mix(GameModelDataSourceREST, {
        NS: "rest",
        NAME: "GameModelDataSourceREST"
    });

    Y.extend(GameModelDataSourceREST, DataSourceREST, {
        updateCache: function (e) {
            var cEl, i;

            for (i = 0; i < e.response.results.entities.length; i += 1) {
                cEl = e.response.results.entities[i];
                if (!cEl) {

                } else if (cEl['@class'] === "Team") {
                //@TODO is this case still in use ??
                } else {
                    // @fixme so we can delect scriptlibrary elemnt and still treat the reply as an gamemodel updated event
                    if (e.request.indexOf("ScriptLibrary") != -1) e.cfg.method = "POST";
                    this.applyOperation(e.cfg.method, cEl, e.data);
                }
            }
        }
    });

    Y.namespace('Plugin').GameModelDataSourceREST = GameModelDataSourceREST;

    GameDataSourceREST = function () {
        GameDataSourceREST.superclass.constructor.apply(this, arguments);
    };

    Y.mix(GameDataSourceREST, {
        NS: "rest",
        NAME: "GameDataSourceREST"
    });

    Y.extend(GameDataSourceREST, DataSourceREST, {

        updateCache: function (e) {
            var cEl, i, game, team;                                             // Treat reply

            Y.log("Response received", "info", "Y.Wegas.GameDataSourceREST");

            for (i = 0; i < e.response.results.get("entities").length; i += 1) {
                cEl = e.response.results.get("entities")[i];

                if (!cEl) {

                } else if (cEl.get('@class') === "Team") {
                    game = this.getCachedVariableBy('id', cEl.gameId);
                    this.applyOperation(e.cfg.method, cEl, game.teams);

                } else if (cEl.get('@class') === "Player") {
                    team = this.getTeamById(cEl.teamId);
                    this.applyOperation(e.cfg.method, cEl, team.players);

                } else {
                    this.applyOperation(e.cfg.method, cEl, e.data);
                }
            }
        },
        generateRequest: function (data) {
            if (data['@class'] === 'Team') {
                return '/' + data.gameId + '/Team/' + data.id;
            } else if (data['@class'] === 'Player') {
                return "/" + this.getGameByTeamId(data.teamId).id
                + '/Team/' + data.teamId + '/Player/' + data.id;
            } else {
                return "/" + data.id;
            }
        },
        post: function (data, parentData, callback) {
            if (data['@class'] === 'Player') {

                this.sendRequest({
                    request: "/" + this.getGameByTeamId(parentData.id).id + "/Team/" + parentData.id + "/Player",
                    cfg: {
                        method: "POST",
                        data: Y.JSON.stringify(data)
                    },
                    callback: callback
                });
            } else {
                GameDataSourceREST.superclass.post.call(this, data, parentData, callback);
            }
        },
        getCurrentGame: function () {
            return this.getCachedVariableById(Y.Wegas.app.get('currentGame'));
        },
        getCurrentPlayer: function () {
            return this.getPlayerById(Y.Wegas.app.get('currentPlayer'));
        },
        getCurrentTeam: function () {
            return this.getTeamById(Y.Wegas.app.get('currentTeam'));
        },
        getPlayerById: function (playerId) {
            var i, j, k, data = this.getEntities();

            playerId = playerId * 1;                                            // Convert to number

            for (i = 0; i < data.length; i += 1) {
                for (j = 0; j < data[i].get("teams").length; j += 1) {
                    for (k = 0; k < data[i].get("teams")[j].get("players").length; k += 1) {
                        if (data[i].get("teams")[j].get("players")[k].id === playerId) {
                            return data[i].get("teams")[j].get("players")[k];
                        }
                    }
                }
            }
            return null;
        },
        getGameByTeamId: function (teamId) {
            var i, j, data = this.get('host').data;

            teamId = teamId * 1;                                                // Convert to number

            for (i = 0; i < data.length; i += 1) {
                for (j = 0; j < data[i].teams.length; j += 1) {
                    if (data[i].teams[j].id === teamId) {
                        return data[i];
                    }
                }
            }
            return null;
        },
        getTeamById: function (teamId) {
            var i, j, data = this.getEntities();

            teamId = teamId * 1;                                                // Convert to number

            for (i = 0; i < data.length; i += 1) {
                for (j = 0; j < data[i].get("teams").length; j += 1) {
                    if (data[i].get("teams")[j].get("id") === teamId) {
                        return data[i].get("teams")[j];
                    }
                }
            }
            return null;
        },
        getTeamByPlayerId: function (playerId) {
            var i, j, k, data = this.get('host').data;
            for (i = 0; i < data.length; i += 1) {
                for (j = 0; j < data[i].teams.length; j += 1) {
                    for (k = 0; k < data[i].teams[j].players.length; k += 1) {
                        if (data[i].teams[j].players[k].id === playerId) {
                            return data[i].teams[j];
                        }
                    }
                }
            }
            return null;
        }


    });

    Y.namespace('Plugin').GameDataSourceREST = GameDataSourceREST;

    /**
         * FIXME We redefine this so we can use a "." selector and a "@..." field name
         */
    Y.DataSchema.JSON.getPath = function(locator) {
        var path = null,
        keys = [],
        i = 0;

        if (locator) {
            if (locator == '.') return [];					// MODIFIED !!

            // Strip the ["string keys"] and [1] array indexes
            locator = locator.
            replace(/\[(['"])(.*?)\1\]/g,
                function (x,$1,$2) {
                    keys[i]=$2;
                    return '.@'+(i++);
                }).
            replace(/\[(\d+)\]/g,
                function (x,$1) {
                    keys[i]=parseInt($1,10)|0;
                    return '.@'+(i++);
                }).
            replace(/^\./,''); // remove leading dot

            // Validate against problematic characters.
            if (!/[^\w\.\$@]/.test(locator)) {
                path = locator.split('.');
                for (i=path.length-1; i >= 0; --i) {
                    /*if (path[i].charAt(0) === '@') {				// MODIFIED !!
			path[i] = keys[parseInt(path[i].substr(1),10)];
		    }*/
                    }
            }
            else {
            }
        }
        return path;
    }

    // @fixme hack on yui apis
    Y.DataSource.IO.prototype._defRequestFn = function(e) {
        var uri = this.get("source"),
        io = this.get("io"),
        defIOConfig = this.get("ioConfig"),
        request = e.request,
        cfg = Y.merge(defIOConfig, e.cfg, {
            on: Y.merge(defIOConfig, {
                success: this.successHandler,
                failure: this.failureHandler
            }),
            context: this,
            "arguments": e
        });

        // Support for POST transactions
        if(Y.Lang.isString(request)) {
            //if(cfg.method && (cfg.method.toUpperCase() === "POST")) {
            //    cfg.data = cfg.data ? cfg.data+request : request;
            //}
            //else {
            uri += request;
        //}
        }
        Y.DataSource.Local.transactions[e.tId] = io(uri, cfg);
        return e.tId;
    }

    // @FIXME We rewrite this function, should be overriden
    Y.DataSchema.JSON._parseResults = function(schema, json_in, data_out) {
        var results = [],
        path,
        error;

        if(schema.resultListLocator) {
            path = Y.DataSchema.JSON.getPath(schema.resultListLocator);
            if(path) {
                results = Y.DataSchema.JSON.getLocationValue(path, json_in);
                if (results === undefined) {
                    data_out.results = [];
                    error = new Error("JSON results retrieval failure");
                }
                else {
                    if(Lang.isArray(results)) {
                        // if no result fields are passed in, then just take the results array whole-hog
                        // Sometimes you're getting an array of strings, or want the whole object,
                        // so resultFields don't make sense.
                        if (Lang.isArray(schema.resultFields)) {
                            data_out = Y.DataSchema.JSON._getFieldValues.call(this, schema.resultFields, results, data_out);
                        }
                        else {
                            data_out.results = results;
                        }
                    } else if (Lang.isObject(results)) {			// Added
                        if (Lang.isArray(schema.resultFields)) {
                            data_out = Y.DataSchema.JSON._getFieldValues.call(this, schema.resultFields, [results], data_out);
                        }
                        else {
                            data_out.results = results;
                        }
                    } else {
                        data_out.results = [];
                        error = new Error("JSON Schema fields retrieval failure");
                    }
                }
            }
            else {
                error = new Error("JSON Schema results locator failure");
            }

            if (error) {
                data_out.error = error;
            }

        }
        return data_out;
    }
});