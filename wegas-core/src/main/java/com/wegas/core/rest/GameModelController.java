/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.rest;

import org.glassfish.jersey.media.multipart.FormDataBodyPart;
import org.glassfish.jersey.media.multipart.FormDataParam;
import com.wegas.core.ejb.GameModelFacade;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.rest.util.JacksonMapperProvider;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.apache.shiro.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wegas.core.ejb.RequestManager;
import javax.inject.Inject;
import javax.ws.rs.core.Response;
import org.apache.shiro.authz.annotation.RequiresRoles;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Stateless
@Path("GameModel")
@Produces(MediaType.APPLICATION_JSON)
public class GameModelController {

    private static final Logger logger = LoggerFactory.getLogger(GameModelController.class);
    /**
     *
     */
    @EJB
    private GameModelFacade gameModelFacade;

    @Inject
    private RequestManager requestManager;

    /**
     *
     * @param gm
     * @return the new game model
     */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public GameModel create(GameModel gm) {
        gameModelFacade.createWithDebugGame(gm);

        return gm;
    }

    /**
     *
     * @param templateGameModelId
     * @param gm
     * @return the new game model
     * @throws IOException
     */
    @POST
    @Path("{templateGameModelId : [1-9][0-9]*}")
    public GameModel templateCreate(@PathParam("templateGameModelId") Long templateGameModelId, GameModel gm) throws IOException {
        // logger.info(Level.INFO, "POST GameModel");

        SecurityUtils.getSubject().checkPermission("GameModel:Duplicate:gm" + templateGameModelId);

        //TODO : replace duplicate + addDebugGame by duplicateWithDebugGame !
        GameModel duplicate = gameModelFacade.duplicate(templateGameModelId);
        duplicate.setName(gm.getName());

        gameModelFacade.addDebugGame(duplicate);

        return duplicate;
    }

    /**
     * EXPERIMENTAL
     *
     * update default instance based on given player ones
     *
     * @param templateGameModelId
     * @param playerId
     * @return up to date reseted gamemodel
     * @throws IOException
     */
    @POST
    @Path("{templateGameModelId : [1-9][0-9]*}/UpdateFromPlayer/{playerId: [1-9][0-9]*}")
    public GameModel updateFromPlayer(@PathParam("templateGameModelId") Long templateGameModelId,
            @PathParam("playerId") Long playerId) throws IOException {

        GameModel gm = gameModelFacade.setDefaultInstancesFromPlayer(templateGameModelId, playerId);
        gameModelFacade.reset(gm);

        return gm;
    }

    /**
     * EXPERIMENTAL & BUGGY
     *
     * Create a new gameModel based on given player instances status (new
     * gameModel default instance fetch from player ones)
     *
     * This one is Buggy since several instances merge are not cross-gameModel
     * compliant
     *
     * @param templateGameModelId
     * @param playerId
     * @return the new gameModel
     * @throws IOException
     */
    @POST
    @Path("{templateGameModelId : [1-9][0-9]*}/CreateFromPlayer/{playerId: [1-9][0-9]*}")
    public GameModel createFromPlayer(@PathParam("templateGameModelId") Long templateGameModelId,
            @PathParam("playerId") Long playerId) throws IOException {

        SecurityUtils.getSubject().checkPermission("GameModel:Duplicate:gm" + templateGameModelId);
        GameModel duplicate = gameModelFacade.createFromPlayer(templateGameModelId, playerId);

        return duplicate;
    }

    /**
     *
     * @param file
     * @param details
     * @return the new uploaded gameModel
     * @throws IOException
     */
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public GameModel upload(@FormDataParam("file") InputStream file,
            @FormDataParam("file") FormDataBodyPart details) throws IOException {

        ObjectMapper mapper = JacksonMapperProvider.getMapper();                // Retrieve a jackson mapper instance
        GameModel gm = mapper.readValue(file, GameModel.class);                 // and deserialize file

        gm.setName(gameModelFacade.findUniqueName(gm.getName()));               // Find a unique name for this new game

        gameModelFacade.createWithDebugGame(gm);
        return gm;
    }

    /**
     *
     * @param entityId
     * @return the requested GameModel
     */
    @GET
    @Produces(MediaType.APPLICATION_JSON + "; charset=utf-8")                   // @hack force utf-8 charset
    @Path("{entityId : [1-9][0-9]*}")
    public GameModel get(@PathParam("entityId") Long entityId) {
        return gameModelFacade.find(entityId);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON + "; charset=utf-8")                   // @hack force utf-8 charset
    @Path("{entityId : [1-9][0-9]*}/{filename: .*}.json")                       // @hack allow to add a filename with *.json to have a nice file
    public Response downloadJSON(@PathParam("entityId") Long entityId, @PathParam("filename") String filename) {
        return Response.ok(this.get(entityId))
                .header("Content-Disposition", "attachment; filename=" + filename).build();
    }

    /**
     *
     * @param entityId
     * @param entity
     * @return up to date gameModel
     */
    @PUT
    @Path("{entityId: [1-9][0-9]*}")
    public GameModel update(@PathParam("entityId") Long entityId, GameModel entity) {
        return gameModelFacade.update(entityId, entity);
    }

    /**
     *
     * @param entityId
     * @return game model Copy
     * @throws IOException
     */
    @POST
    @Path("{entityId: [1-9][0-9]*}/Duplicate")
    public GameModel duplicate(@PathParam("entityId") Long entityId) throws IOException {

        SecurityUtils.getSubject().checkPermission("GameModel:Duplicate:gm" + entityId);

        return gameModelFacade.duplicateWithDebugGame(entityId);
    }

    /**
     *
     * @return all gameModel the current user can see
     */
    @GET
    public Collection<GameModel> index() {
        return findByStatus(GameModel.Status.LIVE);
    }

    /**
     * Update gameModel status (bin, live, etc)(
     *
     * @param entityId
     * @param status
     * @return the game model with up to date status
     */
    @PUT
    @Path("{entityId: [1-9][0-9]*}/status/{status: [A-Z]*}")
    public GameModel changeStatus(@PathParam("entityId") Long entityId, @PathParam("status") final GameModel.Status status) {
        GameModel gm = gameModelFacade.find(entityId);
        switch (status) {
            case LIVE:
                if (requestManager.canRestoreGameModel(gm)){
                    gameModelFacade.live(gm);
                }
                break;
            case BIN:
                if (requestManager.canDeleteGameModel(gm)){
                    gameModelFacade.bin(gm);
                }
                break;
            case DELETE:
                if (requestManager.canDeleteGameModel(gm)){
                    gameModelFacade.delete(gm);
                }
                break;

        }
        return gm;
    }

    /**
     * Get all gameModel with given status
     *
     * @param status
     * @return all gameModels with given status the user has access too
     */
    @GET
    @Path("status/{status: [A-Z]*}")
    public Collection<GameModel> findByStatus(@PathParam("status") final GameModel.Status status) {
        return gameModelFacade.findByStatusAndUser(status);
    }

    /**
     * count gameModel with given status
     *
     * @param status
     * @return the number of gameModel with the given status the current user
     *         has access too
     */
    @GET
    @Path("status/{status: [A-Z]*}/count")
    public int countByStatus(@PathParam("status") final GameModel.Status status) {
        return this.findByStatus(status).size();
    }

    /**
     * Move to bin a LIVE gameModel, Delete a bin one
     *
     * @param entityId
     * @return the just movedToBin/deleted gameModel
     */
    @DELETE
    @Path("{entityId: [1-9][0-9]*}")
    public GameModel delete(@PathParam("entityId") Long entityId) {
        SecurityUtils.getSubject().checkPermission("GameModel:Delete:gm" + entityId);
        GameModel entity = gameModelFacade.find(entityId);
        switch (entity.getStatus()) {
            case LIVE:
                gameModelFacade.bin(entity);
                break;
            case BIN:
                gameModelFacade.delete(entity);
                break;
        }
        // gameModelFacade.asyncRemove(entityId);
        return entity;
    }

    /**
     * Delete all gameModel the current user has access too (set status =
     * delete)
     *
     * @return all deleted gameModel
     */
    @DELETE
    public Collection<GameModel> deleteAll() {
        Collection<GameModel> games = new ArrayList<>();
        for (GameModel gm : gameModelFacade.findByStatus(GameModel.Status.BIN)) {
            if (requestManager.canDeleteGameModel(gm)){
                gameModelFacade.delete(gm);
                games.add(gm);
            }
        }
        return games;
    }

    @DELETE
    @Path("CleanDatabase")
    @RequiresRoles("Administrator")
    public void deleteForceAll() {
        gameModelFacade.removeGameModels();
    }
}
