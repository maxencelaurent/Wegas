/*
 * Wegas
 * http://www.albasim.ch/wegas/
 *
 * Copyright (c) 2013 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */

/**
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */

YUI.add("wegas-loginbutton", function (Y) {
    "use strict";

    var LoginButton;

    /**
     * Login button
     */
    LoginButton = Y.Base.create("wegas-login", Y.Wegas.Button, [], {
        bindUI: function () {
            Y.Wegas.LoginButton.superclass.bindUI.apply(this, arguments);
            Y.Wegas.UserFacade.after("update", this.syncUI, this);

            if (this.menu) {                                                    // Don't add the plugin if it already exist.
                return;
            }

            this.plug(Y.Plugin.WidgetMenu, {
                children: [{
                    type: "Button",
                    label: "Preferences",
                    plugins: [{
                        "fn": "OpenPageAction",
                        "cfg": {
                            "subpageId": this.get("preferencePageId"), // @fixme
                            "targetPageLoaderId": this.get("targetPageLoader")
                        }
                    }]
                }, {
                    type: "Button",
                    label: "Logout",
                    "plugins": [{
                        fn: "OpenUrlAction",
                        cfg: {
                            url: "wegas-app/logout",
                            target: "self"
                        }
                    }
                    ]
                }]
            });
        },
        syncUI: function () {
            Y.Wegas.LoginButton.superclass.syncUI.apply(this, arguments);

            var cUser = Y.Wegas.app.get("currentUser"),
            cPlayer = Y.Wegas.GameFacade.rest.getCurrentPlayer(),
            cTeam = Y.Wegas.GameFacade.rest.getCurrentTeam(),
            name = cUser.name || "undefined";
            if (!this.get('labelIsUser')) {
                if (cPlayer) {
                    name = cPlayer.get("name");
                }
                if (cTeam) {
                    name = cTeam.get("name") + " : " + name;
                }
            }
            this.set("label", name);
        }
    }, {
        ATTRS: {
            labelIsUser: {
                value: false,
                validator: function(b) {
                    return (b === 'true' || b === true);
                }
            },
            type: {
                value: "LoginButton"
            },
            plugins: {
                "transient": true,
                getter: function () {
                    return [];
                }
            },
            preferencePageId: {
                value: 1000                                                     //@fixme
            },
            targetPageLoader: {
                value: "maindisplayarea"
            }
        }
    });
    Y.namespace('Wegas').LoginButton = LoginButton;

});
