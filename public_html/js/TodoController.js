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
app.directive('transformDate', function () {
    return{
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            if (ngModel) {
                ngModel.$parsers.push(function (value) {
                    return new Date(value).getTime();
                });
                ngModel.$formatters.push(function (value) {
//                     var dt = moment(value);
//                     return dt.format("MM/DD/YYYY");
                    return '';
                });
            }
        }
    };
});
app.directive('transformPin', function () {
    return{
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            if (ngModel) {
                ngModel.$parsers.push(function (value) {
                    return md5(value);
                    ;
                });
                ngModel.$formatters.push(function (value) {
                    var dt = new Date(value);
                    return '';
                })
            }
        }
    }
});

app.controller("TodoController", function ($scope, $http, $timeout) {
    $scope.todoDTO = {};
    $scope.todoModel = {};

    var users = {};
    var dialog = {};
    dialog.window = document.getElementById('confirmDialog');

    initTodoModel($scope.todoModel);
    initDialogCloseBtn();
    initAddTodoBtn();

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

        if (todo.isComplete) {
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
                                $scope.todoDTO.todos.sort(sortTodos);
                            });
                            console.log($scope.todoDTO.todos);
                        });
                    }
//                console.log($scope.todoDTO);
                });
    };

    $scope.changePriority = function (index) {
        var todo = $scope.todoDTO.todos[index];
        var prio = todo.priority;
        if (prio === 'LOW') {
            todo.priority = 'MED';
        } else if (prio === 'MED') {
            todo.priority = 'HIGH';
        } else {
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

    $scope.remove = function (index) {
        dialog.windowIndex = index;
        dialog.isOpen = true;
        dialog.window.addEventListener('close', function (e) {
            $(dialog.window).css({
                width: '10px',
                height: '10px'
            }).children().css({
                opacity: 0
            });
            console.log('closing...');
            console.log(e);
            dialog.isOpen = false;
        });
        dialog.window.showModal();
        $(dialog.window).animate({
            width: '400px',
            height: '125px',
            opacity: 1
        }, 500).children().css({
            opacity: 0
        }).animate({
            opacity: 1
        }, 1500);
    };

    $scope.pinChanged = function () {
        var element = $('#todo-pin');
        var pin = element.val();
        if (pin.length === 4) {
            var email = $('#todo-email').val();
            console.log('email: ' + email);
            if (email && email.indexOf('@') > 0) {
                console.log('email is valid');
                var user = findUserByEmail(email);
                if (user !== undefined) {
                    console.log('user is valid');
                    var encryptedPin = user.pin;
                    var inputPin = md5(pin);

                    console.log('enc pin: ' + encryptedPin);
                    console.log('inp pin: ' + inputPin);
                    
                    if (encryptedPin === inputPin) {
                        console.log('pins are valid');
                        $scope.todoModel.createdBy = user;
                        $scope.todoModel.createdBy.todoList = undefined;
                        console.log('user found');
                        element.fadeOut(400).animate({
                            width: 0
                        }, 150);
                        $('#pin-label').animate({
                            width: '98.3%'
                        }, 500).addClass('pin-transition').on('click', function () {
                            console.log('pin clicked');
                            console.log('posting:');
                            console.log($scope.todoModel);
                            $http.post('http://localhost:8080/todo/add', $scope.todoModel).
                                    success(function (data) {
                                        var todo = data;
                                        if (todo !== undefined) {
                                            console.log('Added todo successfully');
                                            console.log(todo);
                                            $scope.todoDTO.todos.push(todo);
                                            $scope.todoDTO.todos.sort(sortTodos);
                                        }
                                    });
                        });
                    }
                }
            }
        } else {
            element.unbind('click');
        }
    };

    function closeConfirmDialog() {
        $(dialog.window).animate({
            width: '10px',
            height: '10px',
            opacity: 0
        }, 500);
        $("#todo_" + dialog.windowIndex).delay(400).animate({
            width: 0,
            height: 0,
            margin: 0,
            opacity: 0,
            display: 'none'
        }, 1000, function () {
            dialog.windowIndex = undefined;
            dialog.window.close();
            dialog.isOpen = false;

            $timeout(function () {
                $scope.todoDTO.todos.splice(dialog.windowIndex, 0);
            });
        });
    }

    function getPriorityBgColor(todo) {
        var prio = todo.priority;
        var bgColor = undefined;
        if (prio === 'LOW') {
            bgColor = '#02C03C';
        } else if (prio === 'MED') {
            bgColor = '#F4D871';
        } else {
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

    /**
     * Sorting based on points system. subtract point a from point b
     * @param {type} a
     * @param {type} b
     * @return {Number}
     */
    function sortTodos(a, b) {
        var aPoints = prioritizeTodo(a);
        var bPoints = prioritizeTodo(b);
        return aPoints - bPoints;
    }

    /**
     * Assign points to the given todo based on the factors below:
     * 1. the given todo starts with 5 points
     * 2. subtract 2 points is priority is high, 1 if med
     * 3. subtract 1 point if not yet completed.
     * @param {type} todo
     * @return {Number}
     */
    function prioritizeTodo(todo) {
        var points = 5;
        if (todo.priority === 'HIGH') {
            points -= 2;
        } else if (todo.priority === 'MED') {
            points -= 1;
        }
        if (!todo.isComplete) {
            points -= 1;
        }
        return points;
    }

    function initDialogCloseBtn() {
        $('#closeConfirm').on("click", function () {
            console.log(dialog.window);
            console.log(dialog.window.dialogArguments);
            var todo = $scope.todoDTO.todos[dialog.windowIndex];
            todo.isRemoved = true;

            $http.put('http://localhost:8080/todo/edit', todo).
                    success(function (data) {
                        todo = data;
                        if (todo !== undefined) {
                            closeConfirmDialog();
                        }
                    }).
                    error(function () {
                        closeConfirmDialog();
                    });
        });
    }
    ;

    function initAddTodoBtn() {
        var $input = $('#todo-due-by').pickadate();

        $("#as-todo").on('click', function () {
            initTodoModel($scope.todoModel);
            var addDialog = document.getElementById('addTodoDialog');
            addDialog.showModal();

        });
    }

    function findUserByEmail(email) {
        var elem = undefined;
        if (email) {
            email = email.trim();
            $scope.todoDTO.todos.forEach(function (element, index, array) {
                if (element.createdBy.email.toUpperCase() === email.toUpperCase()) {
                    elem = element.createdBy;
                }
            });
        }
        return elem;
    }

    function initTodoModel(model) {
        model.createdBy = {};
        model.createdBy.email = undefined;
        model.createdBy.fname = undefined;
        model.createdBy.lname = undefined;
        model.createdBy.pin = undefined;
        model.createdOn = new Date().getTime();
        model.dueBy = undefined;
        model.id = undefined;
        model.isComplete = false;
        model.isRemoved = false;
        model.priority = 'LOW';
        model.recurrence = 'One-Time';
        model.type = 'Todo';
        model.value = undefined;
    }
});

