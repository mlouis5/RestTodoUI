/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var app = angular.module("myapp", ['ngAnimate']);

app.directive("toDo", function () {
    return{
        restrict: 'AE',
        templateUrl: 'html/todoCard.html',
        link: function (scope, element, attrs) {

        }
    };
});

app.controller("TodoController", function ($scope, $http) {
    $scope.todoDTO = {};

    var users = {};

    $http.get('http://localhost:8080/todo').
            success(function (data) {
                initTodos(data.todos);
                $scope.todoDTO = data;
                console.log($scope.todoDTO);
            });

    /**
     * Initialize todo list, add createdBy to each one.
     * @param {type} todos
     * @return {undefined}
     */   
    function initTodos(todos){
        if(todos === undefined){
            return;
        }
        todos.forEach(findUsers);
        todos.forEach(assignUsers);
    }
    /**
     * find all users and add to map.
     * @param {type} element
     * @param {type} index
     * @param {type} array
     * @return {undefined}
     */
    function findUsers(element, index, array) {
        var createdBy = element.createdBy;
        if (typeof createdBy === 'object') {
            users[createdBy['@id'].toString()] = createdBy;
        }
    }
    /**
     * for a given todo, add it corresponding user.
     * @param {type} element
     * @param {type} index
     * @param {type} array
     * @return {undefined}
     */
    function assignUsers(element, index, array) {
        var createdBy = element.createdBy;
        if (Math.round(createdBy) === createdBy) {
            var user = users[createdBy.toString()];
            element.createdBy = user;
        }
    }
});

