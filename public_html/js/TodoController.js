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

    var todoApi = {};
    todoApi.host = '192.168.11.119';
    todoApi.port = '8090';
    todoApi.allTodos = 'http://' + todoApi.host + ':' + todoApi.port + '/todo';
    todoApi.edit = 'http://' + todoApi.host + ':' + todoApi.port + '/todo/edit';
    todoApi.add = 'http://' + todoApi.host + ':' + todoApi.port + '/todo/add';
    todoApi.email = 'http://' + todoApi.host + ':' + todoApi.port + '/todo/email';

    $scope.todoDTO = {};
    $scope.todoModel = {};
    $scope.pages = [];

    var todoSynchronizer = undefined;
    $scope.email = {
        sendTo: new Array(),
        emailChecked: false,
        show: false,
        lock: function (allEmails) {
            if (allEmails) {
                allEmails.forEach(function (val, idx, arr) {
                    $scope.email.sendTo.push({
                        email: val,
                        selected: false,
                        locked: true
                    });
                });
                $scope.email.sendTo.push({
                    email: '',
                    locked: false
                });
            }
        },
        hasDup: function () {
            var isDupl = false;
            var len = $scope.email.sendTo.length;
            for (var i = 0; i < len; i++) {
                var objI = $scope.email.sendTo[i];
                for (var j = i + 1; j < len; j++) {
                    var objJ = $scope.email.sendTo[j];
                    if (objI.email === objJ.email) {
                        isDupl = true;
                        break;
                    }
                }
            }
            return isDupl;
        }
    };
    $scope.emails = [];

    var dialogs = {};
    dialogs.closeDialog = {};
    dialogs.closeDialog.id = 'confirmDialog';


    dialogs.addDialog = {};
    dialogs.addDialog.id = 'addTodoDialog';
    dialogs.addDialog.callback;
    dialogs.addDialog.modal = $("#add-modal").animatedModal();


    initTodoModel($scope.todoModel, false);
    initDialogCloseBtn();

    $http.get(todoApi.allTodos).
            success(function (data) {
                todoSynchronizer = new TodoSynchonizer(data.todos);
                $scope.pages = todoSynchronizer.getPageNumbers();
                $scope.email.lock(todoSynchronizer.getAllUserEmails());
                $scope.emails = todoSynchronizer.getAllUserEmails();
                $scope.todoDTO.todos = todoSynchronizer.defaultSort();
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
        dialogs.closeDialog.todo = todoSynchronizer.getTodoCurrentPage(index);
        openDialog(dialogs.closeDialog, 400, 125);
    };

    $scope.addTodo = function () {
        var email = $scope.todoModel.createdBy.email;
        if (email && email.indexOf('@') > 0) {
            var user = todoSynchronizer.findUserByEmail(email);
            if (user !== undefined) {
                $scope.todoModel.createdBy = user;
                $scope.todoModel.createdBy.todoList = undefined;
                $http.post(todoApi.add, $scope.todoModel).
                        success(function (data) {
                            var todo = data;
                            if (todo !== undefined) {
                                var pNum = todoSynchronizer.getCurrentPageNum();
                                todoSynchronizer.addTodo(todo, true);
                                $scope.pages = todoSynchronizer.getPageNumbers();
                                $scope.todoDTO.todos = todoSynchronizer.getCurrentPage();
                                dialogs.addDialog.modal.triggerClose();
                                initTodoModel($scope.todoModel, true);
                                $scope.pageChange(pNum);
                            }
                        });
            }
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
        if (width <= 0) {
            emailInput.css({
                display: 'inline-block'
            }).animate({
                width: '282px',
                opacity: 1
            }, 550, function () {
//                $scope.email.show = true;
            });
        } else if (width > 0) {
            var text = emailInput.val();
            text = getAllEmails(text);
            console.log('text before if: ' + text);
            if (text !== undefined && text !== '') {
                console.log(text);
                todo.sendTo = text;

                $http.put(todoApi.email, todo).
                        success(function (data) {
                            var todo = data;
                            if (todo !== undefined || todo !== null) {
                                console.log('emailed todo successfully');
                                console.log(todo);
                                closeSendEmailField(emailInput);
                                emailInput.val('');
                            }
                        });

            } else {
                closeSendEmailField(emailInput);
            }
        }
    };

    function closeSendEmailField(emailInput) {
        emailInput.animate({
            width: 0,
            opacity: 0
        }, 550, function () {
            $(this).css({
                display: 'none'
            });
//            $scope.email.show = false;
        });
    }

    function getAllEmails(emailText) {
        var emailArr = emailText.split(/[\s+|,\s*]/);
        console.log('emailArr');
        console.log(emailArr);

        var uniqueEmails = [];
        $.each(emailArr, function (i, elem) {
            if (elem.indexOf('@') > -1) {
                if ($.inArray(elem, uniqueEmails) === -1) {
                    uniqueEmails.push(elem);
                }
            }
        });
        $.each($scope.email.sendTo, function (i, elem) {
            if (elem.selected && elem.email.indexOf('@') > -1) {
                if ($.inArray(elem.email, uniqueEmails) === -1) {
                    uniqueEmails.push(elem.email);
                }
            }
        });
        var emailStr = '';
        uniqueEmails.forEach(function (val, idx, arr) {
            if (idx === (arr.length - 1)) {
                emailStr += val;
            } else {
                emailStr += val + ', ';
            }
        });
        return emailStr;
    }

    $scope.addCustomEmail = function () {
        var lastEmail = $($scope.email.sendTo).get(-1);
        if (!lastEmail || lastEmail.email === '') {
            return;
        }

//        var toVerify = lastEmail.email;
//        var uri = 'https://api.kickbox.io/v2/verify?email=' + toVerify + '&apikey=c24bda21ab445322a28dec73712eb32a3ed0fdd8c1559ae5c835e475879c663d';
//        var isValid = false;
//        $http.get(uri).
//                success(function (data) {
//                    isValid = data.result = 'deliverable';
//                });
//        if (isValid) {
        lastEmail.locked = true;
        lastEmail.selected = true;
        $scope.email.sendTo.push({
            email: '',
            locked: false
        });
//        }else{
//            lastEmail.email = '';
//        }
    };

    $scope.selectEmail = function (mail) {
        if (mail.email === '' || mail.email === undefined) {
            return;
        }
        mail.selected = !mail.selected;
//        $scope.email.sendTo.forEach(function(val, idx, arr){
//            if(val.email === mail.email){
//                val.selected = true;
//            }
//        });
    };

    $scope.selectAllEmail = function (id) {
        console.log('click registered');
        var elem = $('#' + id);
        var isSelected = elem.is(':checked');
        console.log('isSelected: ' + isSelected);
        $scope.email.sendTo.forEach(function (val, idx, arr) {
            val.selected = isSelected;
        });
    };

    $scope.resetTodoModel = function (model, eraseValue) {
        initTodoModel(model, eraseValue);
    };

    $scope.$watch(function (scope) {
        return scope.emailChecked;
    }, function (newValue, oldValue) {
        if (newValue) {

        }
    }
    );

    function closeDialog(dialogId) {
        var dialog = undefined;
        for (var prop in dialogs) {
            if (dialogs.hasOwnProperty(prop)) {
                var propId = dialogs[prop].id;
                if (propId === dialogId) {
                    dialog = dialogs[prop];
                    break;
                }
            }
        }
        if (dialog) {
            dialog.callback(dialog);
        }
    }

    function closeConfirmDialog(dialog) {
        var todo = todoSynchronizer.getTodoCurrentPage(dialog.windowIndex);
        if (todo) {
            todo.isRemoved = true;
            $http.put(todoApi.edit, todo).
                    success(function (data) {
                        todo = data;
                        if (todo !== undefined) {
                            $("#todo_" + dialog.windowIndex).animate({
                                width: 0,
                                height: 0,
                                margin: 0,
                                opacity: 0,
                                display: 'none'
                            }, 1000, function () {
                                minimizeWindow(dialog, exitDialog);
                                dialog.windowIndex = undefined;
                                dialog.isOpen = false;

                                todoSynchronizer.removeTodo(dialogs.closeDialog.todo.id);
                                $timeout(function () {
                                    $scope.todoDTO.todos = todoSynchronizer.getCurrentPage();
                                    $scope.pages = todoSynchronizer.getPageNumbers();
                                    dialog.todo = undefined;
                                    var pNum = todoSynchronizer.getCurrentPageNum();
                                    $("#page_" + pNum).addClass('first-page');
                                });
                            });
                        }
                    }).
                    error(function () {
                        minimizeWindow(dialog, exitDialog);
                        dialog.windowIndex = undefined;
                        dialog.isOpen = false;
                    });
        }
    }

    function closeAddTodoDialog(dialog) {
        minimizeWindow(dialog, exitDialog);
    }

    function minimizeWindow(dialog, callback) {
        var window = document.getElementById(dialog.id);
        var jqWndw = $(window);
        jqWndw.children().each(function (index) {
            $(this).animate({
                opacity: 0
            }, 400);
        });
        jqWndw.delay(350).animate({
            width: 0,
            height: 0,
            opacity: 0
        }, 500, function () {
            callback(dialog);
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
            closeDialog($(this).attr('data-parent'));
        });
    }

//    function initAddTodoBtn() {
//        $("#add-todo").on('click', function () {
//            initTodoModel($scope.todoModel, false);
//            openDialog(dialogs.addDialog, 500, 490);
//            $('#close-addtodo').on('click', function () {
//                closeDialog($(this).attr('data-parent'));
//                initTodoModel($scope.todoModel, true);
//                $(this).unbind('click');
//            });
//        });
//    }

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

    function initTodoModel(model, eraseValue) {
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
        if (eraseValue) {
            model.value = undefined;
        }
//        var element = $('#todo-pin');
//        var pin = element.val('');
//        element.fadeIn(400).animate({
//            width: 350
//        }, 150);
//        $('#pin-label').removeClass('pin-transition').text('Pin:').animate({
//            width: 125,
////            backgroundColor: 'inherit',
//            opacity: 1,
//            color: '#f0f0f0'
//        });
    }

    function openDialog(dialog, width, height) {
        if (dialog && width && height) {
            var windw = document.getElementById(dialog.id);
            var widStr = width + 'px';
            var hgtStr = height + 'px';
            windw.addEventListener('close', function (e) {
                $(windw).animate({
                    width: '10px',
                    height: '10px',
                    opacity: 0
                }, 500).delay(500).children().css({
                    opacity: 0
                });
                dialog.isOpen = false;
            });
            windw.showModal();
            $(windw).animate({
                width: widStr,
                height: hgtStr,
                opacity: 1
            }, 500).children().css({
                opacity: 0
            }).animate({
                opacity: 1
            }, 1500, function () {
                dialog.isOpen = true;
            });
        }
    }

    function exitDialog(dialog) {
//        console.log('triggering close');
        var window = document.getElementById(dialog.id);
        window.close();
    }

    dialogs.closeDialog.callback = closeConfirmDialog;
    dialogs.addDialog.callback = closeAddTodoDialog;

    var options = {
        modalTarget: 'animatedModal',
        position: 'fixed',
        width: '1000px',
        height: '100%',
        top: "0px",
        left: "50%",
        marginLeft: '-500px',
        zIndexIn: '9999',
        zIndexOut: '-9999',
        color: "#303435",
        opacityIn: '1',
        opacityOut: '0',
        animatedIn: 'zoomIn',
        animatedOut: 'zoomOut',
        animationDuration: '.6s',
        overflow: 'auto'
    };
    $("#add-modal").animatedModal(options);

    function launchIntoFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    document.getElementById('requestFullScreenId').addEventListener("click", function () {
        // Launch fullscreen for browsers that support it!
        if (!$scope.isFullScreen) {
            launchIntoFullscreen(document.documentElement); // the whole page
            $scope.isFullScreen = true;
        } else {
            exitFullscreen();
            $scope.isFullScreen = false;
        }
    });
});

