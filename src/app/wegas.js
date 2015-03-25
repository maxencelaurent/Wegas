var ServiceURL = "/api/";
angular.module('Wegas', [
    'ui.router',
    'ngAnimate',
    'wegas.service.auth',
    'wegas.behaviours.tools',
    'public',
    'private'
])
.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('wegas', {
            url: '/',
            views: {
                'main@': {
                    controller: 'WegasMainCtrl',
                    templateUrl: 'app/wegas.tmpl.html'
                }
            }
        })
    ;
    $urlRouterProvider.otherwise('/');
}).controller('WegasMainCtrl', function WegasMainCtrl($state, Auth) {
    Auth.getAuthenticatedUser().then(function(user){
    	if(user == null){
    		$state.go("wegas.public");
    	}else{
    		if(user.isScenarist){
	    		$state.go("wegas.private.scenarist");
    		}else{
    			if(user.isTrainer){
	    			$state.go("wegas.private.trainer");
	    		}else{
	    			$state.go("wegas.private.player");
	    		}
    		}
    	}
    });
});
