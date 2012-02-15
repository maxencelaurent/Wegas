/*
 * Wegas. 
 * http://www.albasim.com/wegas/
 * 
 * School of Business and Engineering Vaud, http://www.heig-vd.ch/
 * Media Engineering :: Information Technology Managment :: Comem⁺
 *
 * Copyright (C) 2011 
 */
package com.wegas.rest;

import com.wegas.ejb.MCQVariableManager;
import com.wegas.persistence.variabledescriptor.MCQVariableDescriptorReplyEntity;
import com.wegas.persistence.variabledescriptor.VariableDescriptorEntity;
import com.wegas.persistence.variableinstance.MCQVariableInstanceEntity;
import com.wegas.persistence.variableinstance.MCQVariableInstanceReplyEntity;
import com.wegas.persistence.variableinstance.VariableInstanceEntity;
import com.wegas.script.ScriptEntity;
import com.wegas.script.ScriptManager;



import java.util.List;
import javax.ejb.EJB;
import javax.ejb.Stateless;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

/**
 *
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
@Stateless
@Path("gm/{gameModelId : [1-9][0-9]*}/vardesc/mcqvariable/")
public class MCQVariableController {

    @EJB
    private ScriptManager sm;
    @EJB
    private MCQVariableManager mcqvm;

    /**
     * 
     * @param gameModelId 
     * @param playerId 
     * @param replyId 
     * @return p
     */
    @GET
    @Path("/player/{playerId : [1-9][0-9]*}/reply/{replyId : [1-9][0-9]*}/runscript/")
    @Produces(MediaType.APPLICATION_JSON)
    public List<VariableInstanceEntity> runScript(@PathParam("gameModelId") Long gameModelId,
            @PathParam("playerId") Long playerId, @PathParam("replyId") Long replyId) {
        MCQVariableDescriptorReplyEntity reply = mcqvm.getMCQReply(replyId);
        
        VariableDescriptorEntity vd = reply.getMCQVariableDescriptor();
        MCQVariableInstanceEntity vi = (MCQVariableInstanceEntity)vd.getVariableInstance(playerId);
        
        MCQVariableInstanceReplyEntity viReply = new MCQVariableInstanceReplyEntity();
        viReply.setAnswer(reply.getAnswer());
        viReply.setDescription(reply.getDescription());
        viReply.setName(reply.getName());
        vi.addReply(viReply);
        
        ScriptEntity s = new ScriptEntity();                                    // Run the impact
        s.setContent(reply.getImpact());
        
        return sm.runScript(gameModelId, playerId, s);
    }
}
