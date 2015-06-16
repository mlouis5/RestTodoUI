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

    var syncTodos = function (todoList) {
        if (todoList) {
            if (todoList.length <= maxViewable) {
                viewableTodos = todoList;
            } else {
                numPages = Math.ceil(todoList.length / maxViewable);
                viewableTodos = todoList.slice(0, maxViewable);
            }
            viewableTodos = initTodos(viewableTodos);
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

    syncTodos(todos);

    ///////////PUBLIC METHODS////////////////

    return {
        getCurrentPage: function () {
            return viewableTodos;
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
            if (!isValidPage(p)) {
                return undefined;
            }
            return page(p);
        },
        getPageNumbers: function () {
            var pageNums = [];
            if (todos) {
                console.log(numPages);
                for (var i = 0; i < numPages; i++) {
                    pageNums.push((i+1));
                }
            }
            return pageNums;
        }
    };
}

