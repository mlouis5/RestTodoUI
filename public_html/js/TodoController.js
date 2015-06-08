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

app.controller("TodoController", function ($scope, $http, $timeout) {
    $scope.todoDTO = {};

    var users = {};

    $http.get('http://localhost:8080/todo').
            success(function (data) {
                data.todos = cleanTodos(data.todos);
                initTodos(data.todos);
                data.todos.sort(sortTodos);

                $scope.todoDTO = data;
                console.log($scope.todoDTO);
            });

    $scope.completed = function (index) {
        var todos = $scope.todoDTO;
        var todo = $scope.todoDTO.todos[index];
        
        if(todo.isComplete){
            return;
        }

        todo.isComplete = true;
        $http.put('http://localhost:8080/todo/edit', todo).
                success(function (data) {
                    todo = data;
                    if (todo !== undefined) {
                        $("#completed_" + index).animate({
                            backgroundColor: "#02C03C"
                        }, 500, function () {
                            var temp = $scope.todoDTO.todos.splice(index, 1).pop();
                            $timeout(function () {
                                $scope.todoDTO.todos.push(temp);
                            });
                            console.log($scope.todoDTO.todos);
                        });
                    }
//                console.log($scope.todoDTO);
                });
    };
    
    $scope.changePriority = function(index){
        var todo = $scope.todoDTO.todos[index];
        var prio = todo.priority;
        if(prio === 'LOW'){
            todo.priority = 'MED';
        }else if(prio === 'MED'){
            todo.priority = 'HIGH';
        }else{
            todo.priority = 'LOW';
        }
        
        $http.put('http://localhost:8080/todo/edit', todo).
                success(function (data) {
                    todo = data;
                    var bgColor = getPriorityBgColor(todo);
                    if (todo !== undefined) {
                        $("#priority_" + index).animate({
                            backgroundColor: bgColor
                        }, 500);
                    }
                });
    };

    function getPriorityBgColor(todo){
        var prio = todo.priority;
        var bgColor = undefined;
        if(prio === 'LOW'){
            bgColor = '#02C03C';            
        }else if(prio === 'MED'){
            bgColor = '#F4D871';
        }else{
            bgColor = '#F47771';
        }
        return bgColor;
    }
    /**
     * Initialize todo list, add createdBy to each one.
     * @param {type} todos
     * @return {undefined}
     */
    function initTodos(todos) {
        if (todos === undefined) {
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

    /**
     * Removes any element in the given array that isn't an object type.
     * @param {type} todos
     * @return {unresolved}
     */
    function cleanTodos(todos) {
        var toRemove = [];
        todos.forEach(function (element, index, array) {
            if (typeof element !== 'object') {
                toRemove.push(element);
            }
        });
        toRemove.forEach(function (element, index, array) {
            var index = todos.indexOf(element);
            todos.splice(index, 1);
        });
        return todos;
    }
    
    function sortTodos(a, b){
        if(a.priority === 'HIGH' && b.priority !== 'HIGH'){
            return -1;
        }else if(!a.isComplete && b.isComplete){
            return -1;
        }else if(b.priority === 'HIGH' && !b.isComplete){
            return 1;
        }else{
            return 0;
        }
        
    }
});

