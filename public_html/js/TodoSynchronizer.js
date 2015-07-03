/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
function TodoSynchonizer(allTodos) {

    var maxViewable = 4;
    var numPages = 1;
    var currPage = 1;

    var todos = allTodos;
    var viewableTodos = undefined;

    ///////////PRIVATE METHODS///////////////

    var page = function (p) {
        if (!isValidPage(p)) {
            return undefined;
        }
        currPage = p;
        return sliceTodos(parseInt(p));
    };

    var isInt = function (value) {
        if (isNaN(value)) {
            return false;
        }
        var x = parseFloat(value);
        return (x | 0) === x;
    };

    var isValidPage = function (p) {
        if (isInt(p)) {
            var page = parseInt(p);
            return page > 0 && page <= numPages;
        }
        return false;
    };

    var syncTodos = function (todoList, shouldInit) {
        if (todoList) {
            if (shouldInit) {
                todoList = initTodos(todoList);
//                viewableTodos = initTodos(viewableTodos);
            }
            if (todoList.length <= maxViewable) {
                numPages = 1;
                viewableTodos = todoList;
                currPage = 1;
            } else {
                numPages = Math.ceil(todoList.length / maxViewable);
                viewableTodos = todoList.slice(0, maxViewable);
                currPage = 1;
            }

        }
    };

    var next = function () {
        if (!todos) {
            return;
        }
        if (numPages > currPage) {
            currPage++;
        }
        return sliceTodos(currPage);
    };

    var previous = function () {
        if (!todos) {
            return;
        }
        if (currPage > 1) {
            currPage--;
        }
        return sliceTodos(currPage);
    };
    /**
     * Returns a subarray of all of the todos, at a point in the array that
     * reflects the current page.
     * @param {Integer} page a page number
     * @return {todoList, type}
     */
    var sliceTodos = function (page) {
        viewableTodos = todos.slice(getStartIndex(page), getEndIndex(page));
        return viewableTodos;
    };

    var getStartIndex = function (page) {
        return (maxViewable * page) - maxViewable;
    };

    var getEndIndex = function (page) {
        var end = (maxViewable * page);
        return end >= todos.length ? todos.length : end;
    };

    var initTodos = function (todos) {
        if (todos === undefined) {
            return;
        }
        var users = findUsers(todos);
        return assignUsers(users, todos);
    };

    var removeTodo = function (id) {
        var indexToRemove = undefined;
        for (var i = 0; i < todos.length; i++) {
            var todo = todos[i];
            if (todo) {
                if (todo.id === id) {
                    indexToRemove = i;
                    break;
                }
            }
        }
        if (indexToRemove !== undefined) {
            todos.splice(indexToRemove, 1);
            syncTodos(todos, false);
        }
    };
    /**
     * find all users and add to map.
     * @param {Object} todos
     * @return {undefined}
     */
    var findUsers = function (todos) {
        if (todos) {
            var users = {};
            todos.forEach(function (element, index, array) {
                var createdBy = element.createdBy;
                if (typeof createdBy === 'object') {
                    users[createdBy['@id'].toString()] = createdBy;
                }
            });
            return users;
        }
        return undefined;
    };
    /**
     * for a given todo, add it corresponding user.
     * @param {type} users
     * @param {type} todos
     * @return {undefined}
     */
    var assignUsers = function (users, todos) {
        if (users && todos) {
            console.log('all users:');
            console.log(users);
            console.log('all todos:');
            console.log(todos);
            todos.forEach(function (element, index, array) {
                var createdBy = element.createdBy;
                if (Math.round(createdBy) === createdBy) {
                    var user = users[createdBy.toString()];
                    element.createdBy = user;
                }
            });
            return todos;
        }
        return undefined;
    };

    /**
     * Sorting based on points system. subtract point a from point b
     * @param {type} a
     * @param {type} b
     * @return {Number}
     */
    var sortTodos = function (a, b) {
        var aPoints = prioritizeTodo(a);
        var bPoints = prioritizeTodo(b);
        return aPoints - bPoints;
    };

    /**
     * Assign points to the given todo based on the factors below:
     * 1. the given todo starts with 5 points
     * 2. subtract 2 points is priority is high, 1 if med
     * 3. subtract 1 point if not yet completed.
     * @param {type} todo
     * @return {Number}
     */
    var prioritizeTodo = function (todo) {
        var points = 5;
        if (!todo.isComplete) {
            if (todo.priority === 'HIGH') {
                points -= 5;
            } else if (todo.priority === 'MED') {
                points -= 4;
            } else if (todo.priority === 'LOW') {
                points -= 3;
            }
        }
        return points;
    };

    syncTodos(todos, true);

    ///////////PUBLIC METHODS////////////////

    return {
        removeTodo: function (todoId) {
            removeTodo(todoId);
        },
        addTodo: function (todo, shouldSort) {
            if (todo) {
                todos.push(todo);
                if (shouldSort) {
                    todos.sort(sortTodos);
                }
                syncTodos(todos, false);
            }
        },
        findUserByEmail: function (email) {
            var user = undefined;
            if (email) {
                email = email.trim();
//                console.log(todos);
                todos.forEach(function (element, index, array) {
//                    console.log(element);
//                    console.log(index);
                    if (element.createdBy.email.toUpperCase() === email.toUpperCase()) {
                        user = element.createdBy;
                    }
                });
            }
            return user;
        },
        getAllUserEmails: function () {
            var allUsers = [];
            todos.forEach(function (element, index, array) {
                var user = element.createdBy;
                if (user.email) {
                    if (allUsers.indexOf(user.email) === -1) {
                        allUsers.push(user.email);
                    }
                }
            });
            return allUsers;
        },
        getCurrentPage: function () {
            return viewableTodos;
        },
        getCurrentPageNum: function () {
            return currPage.toString();
        },
        getTodoCurrentPage: function (index) {
            if (index >= 0 && index < viewableTodos.length) {
                return viewableTodos[index];
            }
            return undefined;
        },
        nextPage: function () {
            return next();
        },
        previousPage: function () {
            return previous();
        },
        hasNext: function () {
            return currPage < numPages;
        },
        hasPrevious: function () {
            return currPage > 1;
        },
        getPage: function (p) {
            return page(p);
        },
        getPageNumbers: function () {
            var pageNums = [];
            if (todos) {
                for (var i = 0; i < numPages; i++) {
                    pageNums.push((i + 1));
                }
            }
            return pageNums;
        },
        defaultSort: function () {
            todos.sort(sortTodos);
            syncTodos(todos, false);
            return this.getCurrentPage();
        },
        sortByKey: function (key) {
            if (key && todos) {
                todos.sort(function (a, b) {
                    if (Object.prototype.hasOwnProperty.call(a, key)
                            && Object.prototype.hasOwnProperty.call(b, key)) {
                        var typeOf = typeof a[key];
                        if (typeOf === 'string') {
                            return a[key].localeCompare(b[key]);
                        } else if (typeOf === 'number') {
                            a[key] - b[key];
                        }
                    }
                });
                syncTodos(todos, false);
            }
            return getCurrentPage();
        },
        sortByValue: function (value) {
            var bias = 0;
            if (value && todos) {
                todos.sort(function (a, b) {
                    for (var key in a) {
                        if (a[key] === value) {
                            bias = -1;
                        }
                    }
                    for (var key in b) {
                        if (b[key] === value) {
                            if (bias === -1) {
                                bias = 0;
                            } else {
                                bias = 1;
                            }
                        }
                    }
                    return bias;
                });
                syncTodos(todos, false);
            }
            return getCurrentPage();
        },
        search: function (value) {

        }
    };
}

