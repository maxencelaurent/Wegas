/*
 * Wegas.
 * http://www.albasim.com/wegas/
 *
 * School of Business and Engineering Vaud, http://www.heig-vd.ch/
 * Media Engineering :: Information Technology Managment :: Comem
 *
 * Copyright (C) 2012
 */
package com.wegas.messaging.rest;

import com.wegas.core.ejb.VariableDescriptorFacade;
import com.wegas.core.rest.AbstractRestController;
import com.wegas.messaging.ejb.InGameMailFacade;
import com.wegas.messaging.persistence.variable.InboxInstanceEntity;
import com.wegas.messaging.persistence.variable.MessageEntity;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

/**
 *
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
@Stateless
@Path("GameModel/{gameModelId : [1-9][0-9]*}/VariableDescriptor/InboxDescriptor/")
public class InboxDescriptorController extends AbstractRestController<VariableDescriptorFacade> {
    /*
     *
     */

    @EJB
    private VariableDescriptorFacade inboxDescriptorFacade;
    /**
     *
     */
    @EJB
    private InGameMailFacade inGameMailFacade;

    /**
     *
     * @return
     */
    @Override
    protected VariableDescriptorFacade getFacade() {
        return this.inboxDescriptorFacade;
    }

    @PUT
    @Path("Message/{messageId : [1-9][0-9]*}")
    @Produces(MediaType.APPLICATION_JSON)
    public InboxInstanceEntity editMail(@PathParam("messageId") Long messageId,
            MessageEntity message) {
        MessageEntity update = inGameMailFacade.update(messageId, message);
        return update.getMailboxInstanceEntity();
    }
}
