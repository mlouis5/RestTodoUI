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
                });
            }
        }
    };
});
app.directive('transformText', function () {
    return{
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            if (ngModel) {
                ngModel.$parsers.push(function (value) {
                    if (value.indexOf("\n") > -1) {
                        value = value.replace(/\n/g, ", ");
                        scope.todoModel.type = 'List';
                        return value;
                    } else {
                        if (value.split(" ").length >= 13) {
                            scope.todoModel.type = 'Note';
                        } else {
                            scope.todoModel.type = 'Todo';
                        }
                        return value;
                    }
                });
            }
        }
    };
});

app.controller("TodoController", function ($scope, $http, $timeout) {

    var host = 'localhost';
    var todoApi = {};
    todoApi.allTodos = 'http://' + host + ':8090/todo';
    todoApi.edit = 'http://' + host + ':8090/todo/edit';
    todoApi.add = 'http://' + host + ':8090/todo/add';
    todoApi.email = 'http://' + host + ':8090/todo/email';

    $scope.todoDTO = {};
    $scope.todoModel = {};
    $scope.pages = [];

    var todoSynchronizer = undefined;
    var users = {};

    var dialogs = {};
    dialogs.closeDialog = {};
    dialogs.closeDialog = {};
    dialogs.closeDialog.window = document.getElementById('confirmDialog');

    initTodoModel($scope.todoModel);
    initDialogCloseBtn();
    initAddTodoBtn();

    $http.get(todoApi.allTodos).
            success(function (data) {
                console.log("pre-clean");
                console.log(data);
                todoSynchronizer = new TodoSynchonizer(data.todos);
                $scope.pages = todoSynchronizer.getPageNumbers();

                console.log('pages');
                console.log($scope.pages);
                $scope.todoDTO.todos = todoSynchronizer.defaultSort();

                console.log($scope.todoDTO);
            });

    $scope.completed = function (index) {
        var todo = todoSynchronizer.getTodoCurrentPage(index);
        if (todo === undefined || todo.isComplete) {
            return;
        }
        todo.isComplete = true;
        $http.put(todoApi.edit, todo).
                success(function (data) {
                    todo = data;
                    if (todo) {
                        $("#completed_" + index).animate({
                            backgroundColor: "#02C03C"
                        }, 500, function () {
                            $timeout(function () {
                                $scope.todoDTO.todos = todoSynchronizer.defaultSort();
                            });
                        });
                    }
                });
    };

    $scope.changePriority = function (index) {
        var todo = todoSynchronizer.getTodoCurrentPage(index);
        if (todo === undefined) {
            return;
        }
        var prio = todo.priority;
        if (prio === 'LOW') {
            todo.priority = 'MED';
        } else if (prio === 'MED') {
            todo.priority = 'HIGH';
        } else {
            todo.priority = 'LOW';
        }

        $http.put(todoApi.edit, todo).
                success(function (data) {
                    todo = data;
                    var bgColor = getPriorityBgColor(todo);
                    if (todo !== undefined) {
                        $("#priority_" + index).animate({
                            backgroundColor: bgColor
                        }, 500, function () {
                            $scope.todoDTO.todos = todoSynchronizer.defaultSort();
                            $scope.$apply();
                            var pageNum = todoSynchronizer.getCurrentPageNum();
                            $scope.pageChange(pageNum);
                        });
                    }
                });
    };

    $scope.remove = function (index) {
        dialogs.closeDialog.windowIndex = index;
        dialogs.closeDialog.isOpen = true;
        dialogs.closeDialog.todo = todoSynchronizer.getTodoCurrentPage(index);
        dialogs.closeDialog.window.addEventListener('close', function (e) {
            $(dialogs.closeDialog.window).css({
                width: '10px',
                height: '10px'
            }).children().css({
                opacity: 0
            });
            console.log('closing...');
            console.log(e);
            dialogs.closeDialog.isOpen = false;
        });
        dialogs.closeDialog.window.showModal();
        $(dialogs.closeDialog.window).animate({
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
                var user = todoSynchronizer.findUserByEmail(email);
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
                        $('#pin-label').text('Submit').animate({
                            width: '99%',
                            color: '#f0f0f0',
                            backgroundColor: '#02C03C'
                        }, 500).addClass('pin-transition').on('click', function () {
                            console.log('pin clicked');
                            console.log('posting:');
                            console.log($scope.todoModel);
                            $http.post(todoApi.add, $scope.todoModel).
                                    success(function (data) {
                                        var todo = data;
                                        if (todo !== undefined) {
                                            console.log('Added todo successfully');
                                            console.log(todo);
                                            todoSynchronizer.addTodo(todo, true);
                                            $scope.pages = todoSynchronizer.getPageNumbers();
                                            $scope.todoDTO.todos = todoSynchronizer.getCurrentPage();
                                            var pNum = todoSynchronizer.getCurrentPageNum();
                                            $("#page_" + pNum).addClass('first-page');
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

    $scope.pageChange = function (index) {
        $scope.todoDTO.todos = todoSynchronizer.getPage(index);
        $('.page').each(function () {
            $(this).removeClass('page-transition');
            $(this).animate({
                backgroundColor: 'transparent'
            }, 300);
        });
        console.log($('#page_' + index));
        $('#page_' + index).animate({
            backgroundColor: '#02C03C'
        }, 500);
    };

    $scope.sendTo = function (todo, emailIdIndex) {
        console.log(todo);
        console.log(emailIdIndex);
        var emailInput = $('#send-to-email-' + emailIdIndex);

        var width = parseInt(emailInput.css('width'));
        console.log(width);
        if (width === 0) {
            emailInput.css({
                display: 'inline-block'
            }).animate({
                width: '282px',
                opacity: 1
            }, 550);
        } else if (width > 0) {
            var text = emailInput.val();
            console.log('text before if: ' + text);
            if (text) {
                console.log(text);

                text = 'samira.f.davis@gmail.com';
                todo.sendTo = text;

                $http.put(todoApi.email, todo).
                        success(function (data) {
                            var todo = data;
                            if (todo !== undefined) {
                                console.log('emailed todo successfully');
                                console.log(todo);
//                                todoSynchronizer.addTodo(todo, true);
//                                $scope.pages = todoSynchronizer.getPageNumbers();
//                                $scope.todoDTO.todos = todoSynchronizer.getCurrentPage();
//                                var pNum = todoSynchronizer.getCurrentPageNum();
//                                $("#page_" + pNum).addClass('first-page');
                            }
                        });

            } else {
                emailInput.animate({
                    width: 0,
                    opacity: 0
                }, 550, function () {
                    $(this).css({
                        display: 'none'
                    });
                });
            }
        }

    };

    function closeConfirmDialog() {
        $(dialogs.closeDialog.window).animate({
            width: '10px',
            height: '10px',
            opacity: 0
        }, 500);
        $("#todo_" + dialogs.closeDialog.windowIndex).delay(400).animate({
            width: 0,
            height: 0,
            margin: 0,
            opacity: 0,
            display: 'none'
        }, 1000, function () {
            dialogs.closeDialog.windowIndex = undefined;
            dialogs.closeDialog.window.close();
            dialogs.closeDialog.isOpen = false;

            todoSynchronizer.removeTodo(dialogs.closeDialog.todo.id);
            $timeout(function () {
                $scope.todoDTO.todos = todoSynchronizer.getCurrentPage();
                $scope.pages = todoSynchronizer.getPageNumbers();
                dialogs.closeDialog.todo = undefined;
                var pNum = todoSynchronizer.getCurrentPageNum();
                $("#page_" + pNum).addClass('first-page');
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

    function initDialogCloseBtn() {
        $('#closeConfirm').on("click", function () {
            var todo = $scope.todoDTO.todos[dialogs.closeDialog.windowIndex];
            todo.isRemoved = true;

            $http.put(todoApi.edit, todo).
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
        $("#add-todo").on('click', function () {
            initTodoModel($scope.todoModel);
            dialogs.addDialog = {};
            dialogs.addDialog.window = document.getElementById('addTodoDialog');
            dialogs.addDialog.window.showModal();
        });
    }

    function initSendToButton() {
        $('.send-to').on('click', function () {
            var index = $(this).attr('data-index');
            var emailInput = $('#send-to-email-' + index);
            var width = emailInput.css('width');
            console.log(width);
            if (width > 0) {

            }
        });
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
        model.sendTo = undefined;
//        model.value = undefined;
    }
});

