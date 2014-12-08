/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.exception;

import com.wegas.core.exception.external.WegasErrorMessage;

/**
 *
 * @author Maxence Laurent (maxence.laurent at gmail.com)
 */
public class WegasErrorMessageManager {

    public void throwWarn(String message) {
        throw WegasErrorMessage.warn(message);
    }

    public void throwError(String message) {
        throw WegasErrorMessage.error(message);
    }

    public void throwInfo(String message) {
        throw WegasErrorMessage.info(message);
    }

}