/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.async;

import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.game.Player;
import com.wegas.core.persistence.game.Team;
import java.util.concurrent.Callable;
import javax.ejb.EJB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author maxence
 */
public class Populator implements Callable<Integer> {

    private static final Logger logger = LoggerFactory.getLogger(Populator.class);

    @EJB
    private PopulatorFacade populatorFacade;

    @Override
    public Integer call() {
        AbstractEntity owner;
        int count = 0;

        while ((owner = populatorFacade.getNextOwner(this)) != null) {
            if (owner instanceof Team) {
                populatorFacade.populateTeam(owner.getId());
            } else if (owner instanceof Player) {
                populatorFacade.populatePlayer(owner.getId());
            }
            count++;
        }
        return count;
    }

}
