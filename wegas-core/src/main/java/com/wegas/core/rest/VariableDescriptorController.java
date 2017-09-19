/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.rest;

import com.wegas.core.Helper;
import com.wegas.core.ejb.GameModelFacade;
import com.wegas.core.ejb.RequestManager;
import com.wegas.core.ejb.VariableDescriptorFacade;
import com.wegas.core.exception.client.WegasErrorMessage;
import com.wegas.core.exception.client.WegasNotFoundException;
import com.wegas.core.exception.internal.WegasNoResultException;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.persistence.variable.DescriptorListI;
import com.wegas.core.persistence.variable.VariableDescriptor;
import org.apache.shiro.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import javax.inject.Inject;

/**
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Stateless
@Path("GameModel/{gameModelId: ([1-9][0-9]*)?}{sep: /?}VariableDescriptor")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class VariableDescriptorController {

    private static final Logger logger = LoggerFactory.getLogger(VariableDescriptorController.class);

    /**
     *
     */
    @EJB
    private VariableDescriptorFacade variableDescriptorFacade;

    /**
     *
     */
    @EJB
    private GameModelFacade gameModelFacade;

    @Inject
    private RequestManager requestManager;

    /**
     * @param gameModelId
     * @return all root level variable descriptors
     */
    @GET
    public Collection<VariableDescriptor> index(@PathParam("gameModelId") Long gameModelId) {

        SecurityUtils.getSubject().checkPermission("GameModel:View:gm" + gameModelId);

        GameModel gameModel = gameModelFacade.find(gameModelId);
        return gameModel.getChildVariableDescriptors();
    }

    @POST
    @Path("ByIds")
    public Collection<VariableDescriptor> getByIds(@PathParam("gameModelId") Long gameModelId, List<Long> ids) {
        Collection<VariableDescriptor> descriptors = new ArrayList<>();
        for (Long id : ids) {
            VariableDescriptor desc = variableDescriptorFacade.find(id);
            if (requestManager.hasPermission(desc.getGameModel().getChannel())) {
                descriptors.add(desc);
            }
        }
        return descriptors;
    }

    /**
     * @param entityId
     * @return variable descriptor with the given id
     */
    @GET
    @Path("{entityId : [1-9][0-9]*}")
    public VariableDescriptor get(@PathParam("entityId") Long entityId) {
        VariableDescriptor vd = variableDescriptorFacade.find(entityId);

        SecurityUtils.getSubject().checkPermission("GameModel:View:gm" + vd.getGameModelId());

        return vd;
    }

    /**
     * Add new descriptor at GameModel root level
     *
     * @param gameModelId the game model
     * @param entity      the new descriptor
     * @return the new variable descriptor
     */
    @POST
    public VariableDescriptor create(@PathParam("gameModelId") Long gameModelId,
            VariableDescriptor entity) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        this.variableDescriptorFacade.create(gameModelId, entity);
        return entity;
    }

    /**
     * Add new descriptor in the given gameModel as a child of the descriptor
     * identified by entityId
     *
     * @param entityId the parent descriptor id
     * @param entity   the new descriptor
     * @return the up to date parent descriptor container containing the new
     *         descriptor
     */
    @POST
    @Path("{variableDescriptorId : [1-9][0-9]*}")
    public DescriptorListI createChild(@PathParam("variableDescriptorId") Long entityId, VariableDescriptor entity) {

        SecurityUtils.getSubject().
                checkPermission("GameModel:Edit:gm" + variableDescriptorFacade.find(entityId).getGameModelId());

        return variableDescriptorFacade.createChild(entityId, entity);
    }

    /**
     * Add new descriptor in the given gameModel as a child of the descriptor
     * identified by entityName
     *
     * @param gameModelId
     * @param entityName  parent entity, identified by its name
     * @param entity      Entity to add
     * @return the up to date parent descriptor container containing the new
     *         descriptor
     */
    @POST
    @Path("{variableDescriptorName : [_a-zA-Z][_a-zA-Z0-9]*}")
    public DescriptorListI createChild(@PathParam("gameModelId") Long gameModelId,
            @PathParam("variableDescriptorName") String entityName, VariableDescriptor entity) {

        try {
            SecurityUtils.getSubject().
                    checkPermission("GameModel:Edit:gm" + gameModelId);

            GameModel gm = gameModelFacade.find(gameModelId);
            VariableDescriptor parent = variableDescriptorFacade.find(gm, entityName);

            if (parent instanceof DescriptorListI) {
                return variableDescriptorFacade.createChild(gm, (DescriptorListI) parent, entity);
            } else {
                throw WegasErrorMessage.error("Parent entity does not allow children");
            }
        } catch (WegasNoResultException ex) {
            throw new WegasNotFoundException("Variable " + entityName + " does not exists");
        }
    }

    /**
     * @param entityId
     * @param entity
     * @return up to date entity
     */
    @PUT
    @Path("{entityId: [1-9][0-9]*}")
    public VariableDescriptor update(@PathParam("entityId") Long entityId, VariableDescriptor entity) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + variableDescriptorFacade.find(entityId).getGameModelId());

        return variableDescriptorFacade.update(entityId, entity);
    }

    /**
     * @param descriptorId
     * @param index
     */
    @PUT
    @Path("{descriptorId: [1-9][0-9]*}/Move/{index: [0-9]*}")
    public void move(@PathParam("descriptorId") Long descriptorId, @PathParam("index") int index) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + variableDescriptorFacade.find(descriptorId).getGameModelId());

        variableDescriptorFacade.move(descriptorId, index);
    }

    /**
     * @param descriptorId
     * @param parentDescriptorId
     * @param index
     */
    @PUT
    @Path("{descriptorId: [1-9][0-9]*}/Move/{parentDescriptorId: [1-9][0-9]*}/{index: [0-9]*}")
    public void move(@PathParam("descriptorId") Long descriptorId,
            @PathParam("parentDescriptorId") Long parentDescriptorId,
            @PathParam("index") int index) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + variableDescriptorFacade.find(descriptorId).getGameModelId());

        variableDescriptorFacade.move(descriptorId, parentDescriptorId, index);
    }

    /**
     * Make a descriptor copy that will stands at the same level
     *
     * @param entityId
     * @return the new descriptor
     * @throws IOException
     */
    @POST
    @Path("{entityId: [1-9][0-9]*}/Duplicate")
    public VariableDescriptor duplicate(@PathParam("entityId") Long entityId) throws IOException {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + variableDescriptorFacade.find(entityId).getGameModelId());
        VariableDescriptor duplicate = variableDescriptorFacade.duplicate(entityId);

        DescriptorListI parent = variableDescriptorFacade.find(entityId).getParent();
        if (parent instanceof VariableDescriptor) {
            /*
             * If the duplicated var is in a list descriptor, return the whole 
             * list so the editor will be updated 
             */
            return (VariableDescriptor) parent;
        } else {
            /* 
             * Otherwise, the duplicate is at root level
             * @fixme we shall not make such a difference... 
             * Find a way to return the whole gamemodel rootlevel descriptors !
             */
            return duplicate;
        }
    }

    /**
     *
     * @param entityId
     * @return up to date descriptor container which contains sorted children
     */
    @GET
    @Path("{entityId: [1-9][0-9]*}/Sort")
    public VariableDescriptor sort(@PathParam("entityId") Long entityId) {
        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + variableDescriptorFacade.find(entityId).getGameModelId());
        return variableDescriptorFacade.sort(entityId);
    }

    /**
     * @param entityId
     * @return just deleted descriptor
     */
    @DELETE
    @Path("{entityId: [1-9][0-9]*}")
    public VariableDescriptor delete(@PathParam("entityId") Long entityId) {
        VariableDescriptor entity = variableDescriptorFacade.find(entityId);

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + entity.getGameModelId());

        variableDescriptorFacade.remove(entityId);
        return entity;
    }

    /**
     * Resets all the variables of a given game model
     *
     * @param gameModelId game model id
     * @return HTTP 200 OK
     */
    @GET
    @Path("Reset")
    public Response reset(@PathParam("gameModelId") Long gameModelId) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        gameModelFacade.reset(gameModelId);
        return Response.ok().build();
    }

    /**
     *
     * @param gameModelId
     * @param criteria
     * @return list of descriptor id matching criteria
     */
    @POST
    @Path("contains")
    @Consumes(MediaType.TEXT_PLAIN)
    public List<Long> idsContains(@PathParam("gameModelId") Long gameModelId, String criteria) {
        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);
        List<VariableDescriptor> vars = variableDescriptorFacade.findAll(gameModelId);
        List<Long> matches = new ArrayList<>();
        for (VariableDescriptor d : vars) {
            if (d.contains(criteria)) {
                matches.add(d.getId());
            }
        }
        return matches;
    }

    /**
     *
     * @param gameModelId
     * @param criteria
     * @return list of descriptor id matching all criterias
     */
    @POST
    @Path("containsAll")
    @Consumes(MediaType.TEXT_PLAIN)
    public List<Long> idsContainsAll(@PathParam("gameModelId") Long gameModelId, String criteria) {
        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);
        List<VariableDescriptor> vars = variableDescriptorFacade.findAll(gameModelId);
        List<Long> matches = new ArrayList<>();
        List<String> criterias = new ArrayList<>(Arrays.asList(criteria.trim().split("[ ,]+")));
        criterias.remove("");
        for (VariableDescriptor d : vars) {
            if (d.containsAll(criterias)) {
                matches.add(d.getId());
            }
        }
        return matches;
    }
}
