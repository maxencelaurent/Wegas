/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.rest;

import com.sun.jersey.multipart.FormDataBodyPart;
import com.sun.jersey.multipart.FormDataParam;
import com.wegas.core.ejb.GameModelFacade;
import com.wegas.core.exception.WegasException;
import com.wegas.core.jcr.content.*;
import com.wegas.core.rest.util.annotations.CacheMaxAge;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import java.util.zip.ZipOutputStream;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.jcr.ItemExistsException;
import javax.jcr.LoginException;
import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;
import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import org.apache.shiro.SecurityUtils;
import org.slf4j.LoggerFactory;
import org.xml.sax.SAXException;

/**
 *
 * @author Cyril Junod <cyril.junod at gmail.com>
 */
@Stateless
@Path("GameModel/{gameModelId : ([1-9][0-9]*)?}/File")
public class FileController {

    /**
     *
     */
    static final private org.slf4j.Logger logger = LoggerFactory.getLogger(FileController.class);
    /**
     *
     */
    @EJB
    private GameModelFacade gmFacade;
    /**
     *
     */
    private static final String FILENAME_REGEXP = "(\\w|\\.| |-|_)+";

    /**
     *
     * @param gameModelId
     * @param name
     * @param note
     * @param description
     * @param path
     * @param file
     * @param details
     * @return
     * @throws RepositoryException
     * @throws WegasException
     */
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Path("upload{directory : .*?}")
    public Response upload(@PathParam("gameModelId") Long gameModelId,
            @FormDataParam("name") String name,
            @FormDataParam("note") String note,
            @FormDataParam("description") String description,
            @PathParam("directory") String path,
            @FormDataParam("file") InputStream file,
            @FormDataParam("file") FormDataBodyPart details) throws RepositoryException, WegasException {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        logger.debug("File name: {}", details.getContentDisposition().getFileName());

        if (name == null) {
            name = details.getContentDisposition().getFileName();
        }
        AbstractContentDescriptor detachedFile;
        try {
            if (details.getContentDisposition().getFileName() == null
                    || details.getContentDisposition().getFileName().equals("")) {//Assuming an empty filename means a directory
                detachedFile = this.createDirectory(gameModelId, name, path, note, description);
            } else {
                detachedFile = this.createFile(gameModelId, name, path, details.getMediaType().toString(),
                        note, description, file);
            }
        } catch (final WegasException ex) {
            Response.StatusType status = new Response.StatusType() {
                @Override
                public int getStatusCode() {
                    return 430;
                }

                @Override
                public Response.Status.Family getFamily() {
                    return Response.Status.Family.CLIENT_ERROR;
                }

                @Override
                public String getReasonPhrase() {
                    return ex.getLocalizedMessage();
                }
            };
            return Response.status(status).build();
        }
        return Response.ok(detachedFile, MediaType.APPLICATION_JSON).build();
    }

    /**
     *
     * @param gameModelId
     * @param name
     * @param request
     * @return
     */
    @GET
    @Path("read{absolutePath : .*?}")
    @CacheMaxAge(time = 1, unit = TimeUnit.SECONDS)
    public Response read(@PathParam("gameModelId") Long gameModelId, @PathParam("absolutePath") String name, @Context Request request) {

        SecurityUtils.getSubject().checkPermission("GameModel:View:gm" + gameModelId);

        logger.debug("Asking file (/{})", name);
        AbstractContentDescriptor fileDescriptor;
        ContentConnector connector = null;
        Response.ResponseBuilder response = Response.status(404);
        try {
            connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            fileDescriptor = DescriptorFactory.getDescriptor(name, connector);
        } catch (PathNotFoundException e) {
            logger.debug("Asked path does not exist: {}", e.getMessage());
            if (connector != null) {
                connector.save();
            }
            return response.build();
        } catch (RepositoryException e) {
            logger.error("Need to check those errors", e);
            return response.build();
        }
        if (fileDescriptor instanceof FileDescriptor) {
            Date lastModified = ((FileDescriptor) fileDescriptor).getDataLastModified().getTime();
            response = request.evaluatePreconditions(lastModified);
            if (response == null) {
                response = Response.ok(new BufferedInputStream(((FileDescriptor) fileDescriptor).getBase64Data(), 512));
                response.header("Content-Type", fileDescriptor.getMimeType());
                response.header("Description", fileDescriptor.getDescription());
            }
            response.lastModified(((FileDescriptor) fileDescriptor).getDataLastModified().getTime());

            if (connector != null) {
                connector.save();
            }
        }
        return response.build();
    }

    /**
     *
     * @param gameModelId
     * @param directory
     * @return
     */
    @GET
    @Path("list{absoluteDirectoryPath : .*?}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AbstractContentDescriptor> listDirectory(@PathParam("gameModelId") Long gameModelId, @PathParam("absoluteDirectoryPath") String directory) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        logger.debug("Asking listing for directory (/{})", directory);
        try {
            ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            AbstractContentDescriptor dir = DescriptorFactory.getDescriptor(directory, connector);
            if (!dir.exist() || dir instanceof FileDescriptor) {
                connector.save();
                return null;
            } else if (dir instanceof DirectoryDescriptor) {
                List<AbstractContentDescriptor> ret = ((DirectoryDescriptor) dir).list();
                connector.save();
                Collections.sort(ret, new ContentComparator());
                return ret;
            }
        } catch (LoginException ex) {
            logger.error(null, ex);
        } catch (RepositoryException ex) {
            logger.error(null, ex);
        }
        return new ArrayList<>();
    }

    /**
     *
     * @param gameModelId
     * @return
     * @throws RepositoryException
     * @throws IOException
     */
    @GET
    @Path("exportRawXML")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportXML(@PathParam("gameModelId") Long gameModelId) throws RepositoryException, IOException {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        final ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
        StreamingOutput out = new StreamingOutput() {
            @Override
            public void write(OutputStream output) throws IOException, WebApplicationException {
                try {
                    try {
                        connector.exportXML(output);
                    } catch (SAXException ex) {
                        logger.error(null, ex);
                    }
                } catch (RepositoryException ex) {
                    logger.error(null, ex);
                }
            }
        };
        return Response.ok(out, MediaType.APPLICATION_OCTET_STREAM).header("content-disposition",
                "attachment; filename=WEGAS_" + gmFacade.find(gameModelId).getName() + "_files.xml").build();
    }

    /**
     *
     * @param gameModelId
     * @return
     * @throws RepositoryException
     */
    @GET
    @Path("exportXML")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportGZ(@PathParam("gameModelId") Long gameModelId) throws RepositoryException {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        final ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
        StreamingOutput out = new StreamingOutput() {
            @Override
            public void write(OutputStream output) throws IOException, WebApplicationException {
                try {
                    try {
                        try (ByteArrayOutputStream xmlStream = new ByteArrayOutputStream()) {
                            connector.exportXML(xmlStream);
                            try (GZIPOutputStream o = new GZIPOutputStream(output)) {
                                o.write(xmlStream.toByteArray());
                            }
                        }
                    } catch (SAXException ex) {
                        logger.error(null, ex);
                    }
                } catch (RepositoryException ex) {
                    logger.error(null, ex);
                }
            }
        };
        return Response.ok(out, MediaType.APPLICATION_OCTET_STREAM).header("content-disposition",
                "attachment; filename=WEGAS_" + gmFacade.find(gameModelId).getName() + "_files.xml.gz").build();
    }

    /**
     *
     * @param gameModelId
     * @return
     * @throws RepositoryException
     */
    @GET
    @Path("exportZIP")
    public Response exportZIP(@PathParam("gameModelId") Long gameModelId) throws RepositoryException {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        final ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
        StreamingOutput out = new StreamingOutput() {
            @Override
            public void write(OutputStream output) throws IOException, WebApplicationException {
                try (ZipOutputStream zipOutputStream = new ZipOutputStream(output)) {
                    connector.zipDirectory(zipOutputStream, "/");
                } catch (RepositoryException ex) {
                    logger.error(null, ex);
                }
            }
        };
        return Response.ok(out, "application/zip").
                header("content-disposition", "attachment; filename=WEGAS_" + gmFacade.find(gameModelId).getName() + "_files.zip").build();
    }

    /**
     *
     * @param gameModelId
     * @param file
     * @param details
     * @return
     * @throws RepositoryException
     * @throws IOException
     * @throws SAXException
     * @throws ParserConfigurationException
     * @throws TransformerException
     * @throws WegasException
     */
    @POST
    @Path("importXML")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public List<AbstractContentDescriptor> importXML(@PathParam("gameModelId") Long gameModelId,
            @FormDataParam("file") InputStream file,
            @FormDataParam("file") FormDataBodyPart details)
            throws RepositoryException, IOException, SAXException,
            ParserConfigurationException, TransformerException, WegasException {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        try {
            final ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            switch (details.getMediaType().getSubtype()) {
                case "x-gzip":
                    try (GZIPInputStream in = new GZIPInputStream(file)) {
                        connector.importXML(in);
                    }
                    break;
                case "xml":
                    connector.importXML(file);
                    break;
                default:
                    throw new WegasException("Uploaded file mimetype does not match requirements [XML or Gunzip], found:"
                            + details.getMediaType().toString());
            }
            connector.save();
        } finally {
            file.close();
        }
        return this.listDirectory(gameModelId, "/");
    }

    /**
     *
     * @param gameModelId
     * @param absolutePath
     * @param force
     * @return
     */
    @DELETE
    @Path("{force: (force/)?}delete{absolutePath : .*?}")
    @Produces(MediaType.APPLICATION_JSON)
    public Object delete(@PathParam("gameModelId") Long gameModelId,
            @PathParam("absolutePath") String absolutePath,
            @PathParam("force") String force) {

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        boolean recursive = force.equals("") ? false : true;
        logger.debug("Asking delete for node ({}), force {}", absolutePath, recursive);
        try {
            ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            AbstractContentDescriptor descriptor = DescriptorFactory.getDescriptor(absolutePath, connector);
            if (descriptor.exist()) {
                descriptor.sync();
                if (descriptor instanceof DirectoryDescriptor && ((DirectoryDescriptor) descriptor).isRootDirectory()) {
                    return Response.notModified("Unable to erase Root Directory").build();
                }
                try {
                    descriptor.delete(recursive);
                } catch (ItemExistsException e) {
                    throw new WegasException(absolutePath + " is not empty, preventing removal");
                }
                connector.save();
                return descriptor;
            } else {
                connector.save();
                return Response.notModified("Path" + absolutePath + " does not exist").build();
            }
        } catch (RepositoryException ex) {
            logger.error("Really what append here ??", ex);
        }
        return null;
    }

    /**
     *
     * @param tmpDescriptor
     * @param gameModelId
     * @param absolutePath
     * @return
     */
    @PUT
    @Path("{absolutePath : .*?}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public AbstractContentDescriptor update(AbstractContentDescriptor tmpDescriptor,
            @PathParam("gameModelId") Long gameModelId,
            @PathParam("absolutePath") String absolutePath) {
        ContentConnector connector = null;
        AbstractContentDescriptor descriptor = null;

        SecurityUtils.getSubject().checkPermission("GameModel:Edit:gm" + gameModelId);

        try {
            connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            descriptor = DescriptorFactory.getDescriptor(absolutePath, connector);
            descriptor.setNote(tmpDescriptor.getNote());
            descriptor.setDescription(tmpDescriptor.getDescription());
            descriptor.setContentToRepository();
        } catch (RepositoryException ex) {
            logger.debug("File does not exist", ex);
        } finally {
            connector.save();
        }
        return descriptor;
    }

    /**
     * Well... underlying function not yet implemented do it by hand for now
     *
     * @param gameModelId
     */
    @DELETE
    @Path("destruct")
    public void deleteWorkspace(@PathParam("gameModelId") Long gameModelId) {

        SecurityUtils.getSubject().checkPermission("GameModel:Delete:gm" + gameModelId);

        try {
            ContentConnector fileManager = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            fileManager.deleteWorkspace();
            fileManager.save();
        } catch (LoginException ex) {
            logger.error(null, ex);
        } catch (RepositoryException ex) {
            logger.error(null, ex);
        }
    }

    /**
     *
     * @param gameModelId
     * @param name
     * @param path
     * @param mediaType
     * @param note
     * @param description
     * @param file
     * @return
     * @throws RepositoryException
     * @throws WegasException
     */
    public FileDescriptor createFile(Long gameModelId, String name, String path, String mediaType,
            String note, String description, InputStream file) throws RepositoryException, WegasException {

        logger.debug("File name: {}", name);

        Pattern pattern = Pattern.compile(FILENAME_REGEXP);
        Matcher matcher = pattern.matcher(name);
        if (name.equals("") || !matcher.matches()) {
            throw new WegasException(name + " is not a valid filename.");
        }
        ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);

        AbstractContentDescriptor dir = DescriptorFactory.getDescriptor(path, connector);
        if (dir.exist()) {                                                      //directory has to exist
            FileDescriptor detachedFile = new FileDescriptor(name, path, connector);

            if (!detachedFile.exist()) {                                        //Node should not exist
                detachedFile.setNote(note == null ? "" : note);
                detachedFile.setDescription(description);
                //TODO : check allowed mime-types
                try {
                    detachedFile.setBase64Data(file, mediaType);
                    logger.info(name + "(" + mediaType + ") uploaded");
                    connector.save();
                    return detachedFile;
                } catch (IOException ex) {
                    logger.error("Error reading uploaded file :", ex);
                    throw new WegasException("Error reading uploaded file");
                }
            } else {
                throw new WegasException(detachedFile.getPath() + " " + name + " already exists");
            }
        } else {
            throw new WegasException("Parent directory " + path + " does not exist exists");
        }
    }

    /**
     *
     * @param gameModelId
     * @param name
     * @param path
     * @param note
     * @param description
     * @return
     * @throws RepositoryException
     */
    public DirectoryDescriptor createDirectory(Long gameModelId, String name, String path, String note, String description) throws RepositoryException {

        //logger.debug("Directory name: {}", name);
        Pattern pattern = Pattern.compile(FILENAME_REGEXP);
        Matcher matcher = pattern.matcher(name);
        if (name.equals("") || !matcher.matches()) {
            throw new WegasException(name + " is not a valid filename.");
        }
        ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
        AbstractContentDescriptor dir = DescriptorFactory.getDescriptor(path, connector);
        if (dir.exist()) {                                                      // Directory has to exist
            DirectoryDescriptor detachedFile = new DirectoryDescriptor(name, path, connector);

            if (!detachedFile.exist()) {                                        // Node should not exist
                detachedFile.setNote(note == null ? "" : note);
                detachedFile.setDescription(description);
                detachedFile.sync();
                logger.info("Directory {} created at {}", detachedFile.getName(), detachedFile.getPath());
                return detachedFile;
            } else {
                throw new WegasException(detachedFile.getPath() + " " + name + " already exists");
            }
        } else {
            throw new WegasException(path + " directory does not exist already exists");
        }
    }

    /**
     *
     * @param gameModelId
     * @param path
     * @return
     * @throws RepositoryException
     */
    public boolean directoryExists(Long gameModelId, String path) throws RepositoryException {
        ContentConnector connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
        AbstractContentDescriptor dir = DescriptorFactory.getDescriptor(path, connector);
        return dir.exist();
    }

    /**
     *
     * @param gameModelId
     * @param path
     * @return
     */
    public InputStream getFile(Long gameModelId, String path) {
        logger.debug("Asking file (/{})", path);

        InputStream ret = null;
        AbstractContentDescriptor fileDescriptor = null;
        ContentConnector connector = null;
        try {
            connector = ContentConnectorFactory.getContentConnectorFromGameModel(gameModelId);
            fileDescriptor = DescriptorFactory.getDescriptor(path, connector);
        } catch (PathNotFoundException e) {
            logger.debug("Asked path does not exist: {}", e.getMessage());
            throw new WegasException("Directory " + path + " doest not exist");
        } catch (RepositoryException e) {
            logger.error("Need to check those errors", e);
        }
        if (fileDescriptor instanceof FileDescriptor) {
            ret = new BufferedInputStream(((FileDescriptor) fileDescriptor).getBase64Data(), 512);
            if (connector != null) {
                connector.save();
            }
        }
        return ret;
    }
}
