'use strict';
angular.module('wegas.models.scenarios', [])
  .service('PermissionModel', function($http, $q, $interval, Auth, Responses) {
    var model = this;

    model.getPermissionsFor = function(scenarioId) {
      // Todo
    }

    model.updatePermissions = function(scenarioId, userId, canCreate, canDuplicate, canEdit) {

      var deferred = $q.defer();
      // Removing all permission
      this.deletePermissions(scenarioId, userId).then(function(response) {
        // Remove works ?
        if (response.isErroneous()) {
          deferred.resolve(response);
        } else {
          // Calculating new permission as wegas see them
          var permissions = "";
          if (canEdit) {
            permissions = "View,Edit,Delete,Duplicate,Instantiate";
          } else {
            if (canCreate && canDuplicate) {
              permissions = "Instantiate,Duplicate";
            } else if (canCreate) {
              permissions = "Instantiate";
            } else if (canDuplicate) {
              permissions = "Duplicate";
            } else {
              // No permissions means ok.
              deferred.resolve(Responses.success("Permissions updated.", true));
            }
          }

          var url = "rest/Extended/User/addAccountPermission/" +
            "GameModel:" + permissions + ":gm" + scenarioId + "/" + userId;
          // Updating permissions
          $http
            .post(ServiceURL + url, null, {
              "headers": {
                "managed-mode": "true"
              }
            })
            .success(function(data) {
              if (data.events !== undefined && data.events.length == 0) {
                deferred.resolve(Responses.success("Permissions updated.", true));
              } else if (data.events !== undefined) {
                deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
              } else {
                deferred.resolve(Responses.danger("Whoops...", false));
              }
            }).error(function(data) {
              if (data.events !== undefined &&  data.events.length > 0) {
                deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
              } else {
                deferred.resolve(Responses.danger("Whoops...", false));
              }
            });
        }
      });
      return deferred.promise;
    }

    model.deletePermissions = function(scenarioId, userId) {
      var deferred = $q.defer();

      var url = "rest/Extended/User/DeleteAccountPermissionByInstanceAndAccount/gm" + scenarioId + "/" + userId;

      $http
        .delete(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        })
        .success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            deferred.resolve(Responses.success("Permissions deleted.", true));
          } else if (data.events !== undefined) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        }).error(function(data) {
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        });
      return deferred.promise;
    }
  })
  .service('ScenariosModel', function($http, $q, $interval, Auth, PermissionModel, Responses) {
    var model = this;
    model.scenarios = null;


    function findScenario(id) {
      return _.find(model.scenarios, function(s) {
        return s.id == id;
      });
    }

    function applyIcon(data) {
      var defaultIcon = {
        color: "orange",
        name: "gamepad"
      };
      data.forEach(function(scenario) {
        var iconInfos = scenario.properties.iconUri;
        if (iconInfos == null || iconInfos == "") {
          scenario.icon = defaultIcon;
        } else {
          var infos = iconInfos.split("_");
          if (infos.length == 3 && infos[0] == "ICON") {
            scenario.icon = {
              color: infos[1],
              name: infos[2]
            };

          } else {
            scenario.icon = defaultIcon;
          }
        }
      });
      return data
    }

    model.createScenario = function(name, templateId) {
      var deferred = $q.defer();

      var url = "rest/Public/GameModel/" + templateId;
      $http.post(ServiceURL + url, {
        "@class": "GameModel",
        "name": name,
        "properties": {}
      }, {
        "headers": {
          "managed-mode": "true"
        }
      }).success(function(data) {

        if (data.events !== undefined && data.events.length == 0) {
          var scenario = applyIcon(data.entities)[0];
          model.scenarios.push(scenario);
          deferred.resolve(Responses.success("Scenario created", scenario));
        } else if (data.events !== undefined){
          deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
        } else {
          deferred.resolve(Responses.danger("Whoops...", false));
        }

      }).error(function(data) {
        if (data.events !== undefined &&  data.events.length > 0) {
          deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
        } else {
          deferred.resolve(Responses.danger("Whoops...", false));
        }
      });
      return deferred.promise;
    }

    model.updateScenario = function(scenario) {
      var deferred = $q.defer();

      var url = "rest/Public/GameModel/" + scenario.id + "?view=EditorExtended";
      $http.put(ServiceURL + url, {
        "@class": "GameModel",
        "name": scenario.name,
        "comments": scenario.comments
      }, {
        "headers": {
          "managed-mode": "true"
        }
      }).success(function(data) {

        if (data.events !== undefined && data.events.length == 0) {
          var scenario = applyIcon(data.entities)[0];
          deferred.resolve(Responses.success("Scenario updated", scenario));
        } else if (data.events !== undefined){
          deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
        } else {
          deferred.resolve(Responses.danger("Whoops...", false));
        }
      }).error(function(data) {
        if (data.events !== undefined &&  data.events.length > 0) {
          deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
        } else {
          deferred.resolve(Responses.danger("Whoops...", false));
        }
      });

      return deferred.promise;
    }

    model.archiveScenario = function (scenario) {
      var deferred = $q.defer();
      var url = "rest/GameModel/" + scenario.id;
      $http.delete(ServiceURL + url, {
        "headers": {
          "managed-mode": "true"
        }
      }).success(function(data) {

        if (data.events !== undefined && data.events.length == 0) {
          // Remove scenario from scenarios
          var index = model.scenarios.indexOf(scenario);
          if (index > -1) {
            model.scenarios.splice(index, 1);
          }
          deferred.resolve(Responses.success("Scenario archived", scenario));
        } else if (data.events !== undefined){
          deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
        } else {
          deferred.resolve(Responses.danger("Whoops...", false));
        }
      }).error(function(data) {
        if (data.events !== undefined &&  data.events.length > 0) {
          deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
        } else {
          deferred.resolve(Responses.danger("Whoops...", false));
        }
      });

      return deferred.promise;
    }

    model.deletePermissions = function(scenarioId, userId) {
      return PermissionModel.deletePermissions(scenarioId, userId);
    }
    model.updatePermissions = function(scenarioId, userId, canCreate, canDuplicate, canEdit) {
      return PermissionModel.updatePermissions(scenarioId, userId, canCreate, canDuplicate, canEdit);
    }

    model.getScenarios = function() {


      var deferred = $q.defer();
      if (model.scenarios !== null) {
        deferred.resolve(Responses.success("Scenarios loaded", model.scenarios));
      } else {
        model.scenarios = [];
        var url = "rest/GameModel"
        $http.get(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        })
        .success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            model.scenarios = applyIcon(data.entities);
            deferred.resolve(Responses.success("Scenarios loaded", model.scenarios));
          } else if (data.events !== undefined){
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        }).error(function(data) {
          model.scenarios = [];
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }


        });
      }
      return deferred.promise;
    }

    model.getScenario = function(scenarioId) {
      var deferred = $q.defer();
      if (model.scenarios.length > 0) {
        var scenario = findScenario(scenarioId);
        if (scenario !== null) {
          deferred.resolve(Responses.success("Scenario loaded", scenario));
          return deferred.promise;
        }
      }

      var url = "rest/Public/GameModel/" + scenarioId + "?view=EditorExtended";
        $http.get(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        }).success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            var scenario = applyIcon(data.entities)[0];
            model.scenarios.push(scenario);
            deferred.resolve(Responses.success("Scenario loaded", scenario));
          } else if (data.events !== undefined){
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        }).error(function(data) {
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        });

      return deferred.promise;
    };


    model.getPermissions = function(scenarioId) {

      function mapPermissions(data) {
        /* Transform permissions in a comprehensible way :) */
        var permissions = [];

        var gameRegex = new RegExp(":gm" + scenarioId + "$");
        var itemsRegex = new RegExp(":(.*):");

        /* For each user */
        _.each(data, function(user) {

          /* Search for permissions linked with current scenario */
          var userPermissions = [];
          _.each(user.permissions, function(element, index, list) {
            if (gameRegex.test(element.value)) {
              var items = itemsRegex.exec(element.value);
              userPermissions = userPermissions.concat(items[1].split(","));
            }
          });

          userPermissions = _.uniq(userPermissions); /* Remove duplicates */

          permissions.push({
            user: user,
            permissions: userPermissions
          });

        });
        return permissions;
      }

      var deferred = $q.defer();
      var scenario = findScenario(scenarioId);
      if (scenario === null) {
        deferred.resolve(Responses.danger("Whoops...", false));
      } else {
        var url = "rest/Extended/User/FindAccountPermissionByInstance/gm" + scenarioId
        $http.get(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        }).success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            var permissions = mapPermissions(data.entities);
            deferred.resolve(Responses.success("Permissions loaded", permissions));
          } else if (data.events !== undefined){
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        }).error(function(data) {
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        });
      }
      return deferred.promise;
    };


    model.getVersionsHistory = function(scenarioId) {
      var deferred = $q.defer();
      var url = "rest/Public/GameModel/" + scenarioId + "/File/list/History";

      $http.get(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        })
        .success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            var versions = data.entities;
            deferred.resolve(Responses.success("Versions loaded", versions));
          } else if (data.events !== undefined){
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          };
        }).error(function(data) {
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        });

      return deferred.promise;
    }
    model.addVersionHistory = function(scenarioId) {
      var deferred = $q.defer();

      var url = "rest/Public/GameModel/" + scenarioId + "/CreateVersion";
      $http.post(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        })
        .success(function(data) {
          // TODO: Managed mode seems not implemented...
          // if (data.events !== undefined && data.events.length == 0) {
            deferred.resolve(Responses.success("Version created", true));
          // } else if (data.events !== undefined){
          //   deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          // } else {
          //   deferred.resolve(Responses.danger("Whoops...", false));
          // };
        }).error(function(data) {
          // TODO: Managed mode seems not implemented...
          // if (data.events !== undefined &&  data.events.length > 0) {
          //   deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          // } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          // }
        });

      return deferred.promise;
    }
    model.deleteVersionHistory = function(scenarioId, version) {
      var deferred = $q.defer();
      var url = "rest/Public/GameModel/" + scenarioId + "/File/delete/History/" + version;

      $http.delete(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        })
        .success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            deferred.resolve(Responses.success("Version deleted", true));
          } else if (data.events !== undefined){
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          };
        }).error(function(data) {
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        });

      return deferred.promise;

    }
    model.restoreVersionHistory = function(scenarioId, version) {

      var deferred = $q.defer();
      var url = "rest/Public/GameModel/" + scenarioId + "/Restore/History/" + version;

      $http.get(ServiceURL + url, {
          "headers": {
            "managed-mode": "true"
          }
        })
        .success(function(data) {
          if (data.events !== undefined && data.events.length == 0) {
            var newScenario = data.entities[0];
            model.scenarios.push(newScenario);
            deferred.resolve(Responses.success('Scenario has been duplicated with name: "'+newScenario.name+'"', newScenario));
          } else if (data.events !== undefined){
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          };
        }).error(function(data) {
          if (data.events !== undefined &&  data.events.length > 0) {
            deferred.resolve(Responses.danger(data.events[0].exceptions[0].message, false));
          } else {
            deferred.resolve(Responses.danger("Whoops...", false));
          }
        });

      return deferred.promise;
    }


  });