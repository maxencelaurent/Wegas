/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.i18n.ejb;

import com.wegas.core.Helper;
import com.wegas.core.ejb.GameModelFacade;
import com.wegas.core.ejb.ScriptFacade;
import com.wegas.core.ejb.WegasAbstractFacade;
import com.wegas.core.exception.client.WegasErrorMessage;
import com.wegas.core.exception.client.WegasNotFoundException;
import com.wegas.core.i18n.deepl.Deepl;
import com.wegas.core.i18n.deepl.DeeplTranslations;
import com.wegas.core.i18n.deepl.DeeplUsage;
import com.wegas.core.i18n.persistence.TranslatableContent;
import com.wegas.core.i18n.persistence.Translation;
import com.wegas.core.i18n.rest.ScriptUpdate;
import com.wegas.core.merge.utils.MergeHelper;
import com.wegas.core.merge.utils.MergeHelper.MergeableVisitor;
import com.wegas.core.merge.utils.WegasFieldProperties;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.EntityComparators;
import com.wegas.core.persistence.Mergeable;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.persistence.game.GameModel.GmType;
import com.wegas.core.persistence.game.GameModelLanguage;
import com.wegas.core.persistence.game.Script;
import com.wegas.core.persistence.variable.ModelScoped;
import com.wegas.core.persistence.variable.ModelScoped.ProtectionLevel;
import com.wegas.core.persistence.variable.ModelScoped.Visibility;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.persistence.variable.statemachine.State;
import com.wegas.core.persistence.variable.statemachine.Transition;
import com.wegas.core.persistence.variable.statemachine.TriggerDescriptor;
import com.wegas.mcq.persistence.Result;
import java.beans.IntrospectionException;
import java.beans.PropertyDescriptor;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.ejb.LocalBean;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.script.CompiledScript;
import javax.script.ScriptContext;
import javax.script.ScriptException;
import javax.script.SimpleScriptContext;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author maxence
 */
@Stateless
@LocalBean
public class I18nFacade extends WegasAbstractFacade {

    private static final Logger logger = LoggerFactory.getLogger(I18nFacade.class);

    @Inject
    private GameModelFacade gameModelFacade;

    @Inject
    private ScriptFacade scriptFacade;

    public static enum UpdateType {
        /**
         * Do not change any statuses
         */
        MINOR,
        /**
         * This is a major update -> outdate others languages
         */
        MAJOR,
        /**
         * Mark the translation up-to-date
         */
        CATCH_UP
    }

    /**
     * Create language for the given gamemodel.
     *
     * @param gameModelId id of the gameModel
     * @param code        language code
     * @param name        name of the new language to create
     *
     * @return the gameModel
     */
    public GameModel createLanguage(Long gameModelId, String code, String name) {
        logger.trace("CREATE new language {} for gameModel #{}", name, gameModelId);
        return createLanguage(gameModelFacade.find(gameModelId), code, name);
    }

    public GameModel moveLanguageUp(Long gameModelId, Long languageId) {
        GameModel gameModel = gameModelFacade.find(gameModelId);
        List<GameModelLanguage> languages = Helper.copyAndSortModifiable(gameModel.getRawLanguages(), new EntityComparators.OrderComparator<>());
        GameModelLanguage lang = this.findGameModelLanguage(languageId);
        int indexOf = languages.indexOf(lang);
        if (indexOf > 0) {
            if (languages.remove(lang)) {
                languages.add(indexOf - 1, lang);
                gameModel.setLanguages(languages);
            }
        }
        return gameModel;
    }

    private GameModelLanguage findGameModelLanguage(Long gmlId) {
        return getEntityManager().find(GameModelLanguage.class, gmlId);
    }

    public GameModelLanguage updateLanguage(GameModelLanguage language) {
        Long id = language.getId();
        GameModelLanguage lang = this.findGameModelLanguage(id);
        String oldCode = lang.getCode();
        lang.merge(language);
        String newCode = lang.getCode();

        if (!oldCode.equals(newCode)) {
            this.updateTranslationCode(lang.getGameModel(), oldCode, newCode);
        }

        return lang;
    }

    /**
     * Create language for the given gamemodel.
     *
     * @param gameModel the gameModel
     * @param code      language code
     * @param name      name of the new language to create
     *
     * @return the gameModel
     */
    public GameModel createLanguage(GameModel gameModel, String code, String name) {
        logger.trace("CREATE new language {}/{} for {}", code, name, gameModel);
        GameModelLanguage found = gameModel.getLanguageByName(name);
        GameModelLanguage foundByCode = gameModel.getLanguageByCode(code);

        if (found == null && foundByCode == null) {
            List<GameModelLanguage> rawLanguages = gameModel.getRawLanguages();

            GameModelLanguage newLang = new GameModelLanguage();
            newLang.setGameModel(gameModel);
            newLang.setIndexOrder(rawLanguages.size()); // last position
            newLang.setLang(name);
            newLang.setCode(code);

            if (gameModel.getType().equals(GmType.MODEL)) {
                newLang.setVisibility(Visibility.INTERNAL);
            } else {
                newLang.setVisibility(Visibility.PRIVATE);
            }

            rawLanguages.add(newLang);

            return gameModel;
        } else {
            throw WegasErrorMessage.error("This language already exists");
        }
    }

    public GameModel deleteLanguage(Long gameModelId, String code) {
        logger.trace("Delete language {} for gameModel #{}", code, gameModelId);
        return deleteLanguage(gameModelFacade.find(gameModelId), code);
    }

    public GameModel deleteLanguage(GameModel gameModel, String code) {
        logger.trace("Delete language {} for gameModel #{}", code, gameModel);
        List<GameModelLanguage> rawLanguages = gameModel.getRawLanguages();
        GameModelLanguage lang = gameModel.getLanguageByCode(code);
        if (lang != null) {
            if (rawLanguages.size() > 1) {
                rawLanguages.remove(lang);
                throw WegasErrorMessage.error("NOT YET IMPLEMENTED");
                // please visit the gameModel to clean all lang translations !!!
                // -> EntityVisitor from Modeler branches

            } else {
                throw WegasErrorMessage.error("Removing the last language is forbidden");
            }
        }
        return gameModel;
    }

    /**
     * Load TranslatableContent with the given id
     *
     * @param trId id of the content to search
     *
     * @return translatableContent
     *
     * @throws WegasNotFoundException if such a content does not exists
     */
    public TranslatableContent findTranslatableContent(Long trId) {
        TranslatableContent find = this.getEntityManager().find(TranslatableContent.class, trId);
        if (find != null) {
            return find;
        } else {
            throw new WegasNotFoundException("Translation #" + trId + " does not exist");
        }
    }

    /**
     * Get a newTranslation
     *
     * @param trId content id
     * @param code language code
     *
     * @return the newTranslation
     *
     * @throws WegasNotFoundException if such a newTranslation does not exists
     */
    private Translation getTranslation(Long trId, String code) {
        if (code != null) {
            TranslatableContent i18nContent = this.findTranslatableContent(trId);
            for (Translation tr : i18nContent.getRawTranslations()) {
                if (code.equals(tr.getLang())) {
                    return tr;
                }
            }
        }
        throw new WegasNotFoundException("There is no translation for language " + code);
    }

    /**
     * Get a newTranslation
     *
     * @param code language code
     *
     * @return the newTranslation
     *
     * @throws WegasNotFoundException if such a newTranslation does not exists
     */
    private Translation getTranslation(TranslatableContent trContent, String code) {
        Translation translation = trContent.getTranslation(code);
        if (translation != null) {
            return translation;
        } else {
            throw new WegasNotFoundException("There is no translation for language " + code);
        }
    }

    /**
     * Get a newTranslation
     *
     * @param trId content id
     * @param code language ref name
     *
     * @return the newTranslation
     *
     * @throws WegasNotFoundException if such a newTranslation does not exists
     */
    public String getTranslatedString(Long trId, String code) {
        return this.getTranslation(trId, code).getTranslation();
    }

    public TranslatableContent updateTranslation(Long trId, String code, String newValue, UpdateType mode) {
        TranslatableContent content = this.findTranslatableContent(trId);

        if (content.belongsToProtectedGameModel()) {
            if (content.getParentDescriptor() != null) {
                ModelScoped.Visibility visibility = content.getParentDescriptor().getVisibility();
                if (visibility == ModelScoped.Visibility.INTERNAL
                        || visibility == ModelScoped.Visibility.PROTECTED) {
                    // newTranslation belongs to a variable readonly variable descriptor
                    return content;
                }
            } else if (content.getParentInstance() != null) {
                if (content.getInheritedVisibility() == ModelScoped.Visibility.INTERNAL) {
                    // newTranslation belongs to a variable readonly variableInstance
                    return content;
                }
            }
        }

        if (mode == UpdateType.MAJOR) {
            // make all tr as outdated
            for (Translation t : content.getRawTranslations()) {
                t.setStatus("outdated::" + code);
            }
            // but this one is not
            content.updateTranslation(code, newValue, "");
        } else if (mode == UpdateType.CATCH_UP) {
            // clear the status as the new translation is up to date
            content.updateTranslation(code, newValue, "");
        } else {
            // MINOR change, do not change the status
            content.updateTranslation(code, newValue);
        }

        return content;
    }

    /**
     * Parse impact and return location of the AST node to update
     *
     * @param impact
     * @param index
     * @param code
     * @param newValue
     *
     * @return
     *
     * @throws ScriptException
     */
    private Object fishTranslationLocation(String impact, Integer index, String code, String newValue) throws ScriptException {
        // JAVA 9 will expose Nashorn parser in java !!!
        Map<String, Object> args = new HashMap<>();
        args.put("impact", impact);
        args.put("index", index);
        args.put("code", code.toUpperCase());
        args.put("newValue", newValue);

        ScriptContext ctx = new SimpleScriptContext();

        scriptFacade.nakedEval(getI18nJsHelper(), null, ctx);
        return scriptFacade.nakedEval("I18nHelper.getTranslationLocation()", args, ctx);
    }

    private Object fishTranslationsByCode(String impact, String code) throws ScriptException {
        // JAVA 9 will expose Nashorn parser in java !!!
        Map<String, Object> args = new HashMap<>();
        args.put("impact", impact);
        args.put("code", code.toUpperCase());

        ScriptContext ctx = new SimpleScriptContext();

        scriptFacade.nakedEval(getI18nJsHelper(), null, ctx);
        return scriptFacade.nakedEval("I18nHelper.getTranslations()", args, ctx);
    }

    private CompiledScript getI18nJsHelper() throws ScriptException {
        InputStream resourceAsStream = this.getClass().getResourceAsStream("/helpers/i18nHelper.js");
        InputStreamReader isr = new InputStreamReader(resourceAsStream, StandardCharsets.UTF_8);
        return scriptFacade.compile(isr);
    }

    private Integer[] getIndexes(String script, JSObject result, String key) {

        JSObject location = (JSObject) result.getMember(key);

        if (location.hasMember("start") && location.hasMember("end")) {
            JSObject start = (JSObject) location.getMember("start");
            JSObject end = (JSObject) location.getMember("end");

            Integer startLine = (Integer) start.getMember("line");
            Integer startColumn = (Integer) start.getMember("column");

            Integer endLine = (Integer) end.getMember("line");
            Integer endColumn = (Integer) end.getMember("column");

            Integer[] indexes = new Integer[2];
            int line = 1;
            int col = 1;

            // convert column/line nunbers to absolute indexes
            for (int i = 0; i < script.length(); i++) {
                if (startLine == line) {
                    indexes[0] = i + startColumn;
                }

                if (endLine == line) {
                    indexes[1] = i + endColumn;
                }

                if (indexes[0] != null && indexes[1] != null) {
                    return indexes;
                }

                if (script.charAt(i) == '\n') {
                    line++;
                    col = 0;
                }
                col++;
            }
        }
        return null;
    }

    private static final class InScriptChange {

        private final int startIndex;
        private final int endIndex;

        private final String newValue;

        public InScriptChange(int startIndex, int endIndex, String newValue) {
            this.startIndex = startIndex;
            this.endIndex = endIndex;
            this.newValue = newValue;
        }
    }

    public String updateCodeInScript(String impact, String oldCode, String newCode) throws ScriptException {
        JSObject result = (JSObject) fishTranslationsByCode(impact, oldCode);

        if (result != null) {
            List<InScriptChange> langCodes = new ArrayList<>();
            for (String key : result.keySet()) {

                // TODO: store all indexes; sort them from end to start, replace all oldCode by new one, return new content
                JSObject translation = (JSObject) result.getMember(key);
                String status = (String) translation.getMember("status");
                if ("found".equals(status)) {
                    Integer[] indexes = getIndexes(impact, translation, "keyLoc");
                    if (indexes != null) {
                        langCodes.add(new InScriptChange(indexes[0], indexes[1], "\"" + newCode + "\""));
                    }
                }
            }

            if (!langCodes.isEmpty()) {
                StringBuilder sb = new StringBuilder(impact);

                Collections.sort(langCodes, new Comparator<InScriptChange>() {
                    @Override
                    public int compare(InScriptChange o1, InScriptChange o2) {
                        return o1.startIndex < o2.startIndex ? 1 : -1;
                    }
                });

                for (InScriptChange change : langCodes) {
                    // update lang code
                    sb.replace(change.startIndex - 1, change.endIndex + 1, change.newValue);
                }
                return sb.toString();
            }
        }

        return impact;
    }

    private boolean doesPathLocationsMatches(JSObject inTarget, JSObject inRef) {
        if (inTarget.keySet().size() == inRef.keySet().size()) {
            for (String k : inTarget.keySet()) {
                JSObject trTarget = (JSObject) inTarget.getMember(k);
                JSObject trRef = (JSObject) inTarget.getMember(k);
                if (!trTarget.hasMember("path") || !trRef.hasMember("path") || !trTarget.getMember("path").equals(trRef.getMember("path"))) {
                    // as soon as one path does not match, return false
                    logger.error("Script paths differs");
                    return false;
                }
            }
        } else {
            logger.debug("Number of translations does not match");
            return false;
        }
        // nothing wrong has been detected, return true
        return true;
    }

    public List<TranslatableContent> getInScriptTranslations(String script) throws ScriptException {
        List<TranslatableContent> list = new ArrayList<>();

        Map<String, Object> args = new HashMap<>();
        args.put("impact", script);

        ScriptContext ctx = new SimpleScriptContext();

        scriptFacade.nakedEval(getI18nJsHelper(), null, ctx);
        ScriptObjectMirror nakedEval = (ScriptObjectMirror) scriptFacade.nakedEval("I18nHelper.getTranslatableContents()", args, ctx);

        for (String key : nakedEval.keySet()) {
            list.add((TranslatableContent) nakedEval.getMember(key));
        }
        return list;
    }

    public String updateScriptWithNewTranslation(String impact, int index, String code, String newValue, String newTrStatus) throws ScriptException {
        JSObject result = (JSObject) fishTranslationLocation(impact, index, code, newValue);

        if (result != null) {

            String status = (String) result.getMember("status");

            String newNewValue = (String) result.getMember("newValue");
            String previousStatus = (String) result.getMember("trStatus");
            String translation = "{"
                    + "\"translation\": " + newNewValue + ","
                    + "\"status\": \"" + (newTrStatus != null ? newTrStatus : previousStatus) + "\""
                    + "}";

            Integer[] indexes;

            switch (status) {
                case "found":
                    // the newTranslation already exists
                    indexes = getIndexes(impact, result, "valueLoc");

                    if (indexes != null) {
                        Integer startIndex = indexes[0];
                        Integer endIndex = indexes[1];
                        // update existing newTranslation
                        if (startIndex != null && endIndex != null) {
                            StringBuilder sb = new StringBuilder(impact);
                            sb.replace(startIndex, endIndex, translation);
                            return sb.toString();
                        }
                    }
                    break;
                case "missingCode":
                    indexes = getIndexes(impact, result, "loc");
                    if (indexes != null) {
                        Integer startIndex = indexes[0];
                        Integer endIndex = indexes[1];
                        StringBuilder sb = new StringBuilder(impact);
                        // insert new code property right after opening bracket
                        sb.replace(startIndex + 1, startIndex + 1, "\"" + code + "\": " + translation + ", ");
                        return sb.toString();
                    }
                default:
                    break;

            }
        }
        return null;
    }

    private AbstractEntity getParent(ScriptUpdate scriptUpdate) {
        Class theKlass;
        // hardcoded class name => resolve with a switch is a bad practice, should rely on JSON type name (wait for payara5 / yasson)
        switch (scriptUpdate.getParentClass()) {
            case "TriggerDescriptor":
                theKlass = TriggerDescriptor.class;
                break;
            case "Result":
                theKlass = Result.class;
                break;
            case "Transition":
                theKlass = Transition.class;
                break;
            case "State":
                theKlass = State.class;
                break;
            default:
                theKlass = null;
        }

        if (theKlass != null) {
            // load the parent
            return (AbstractEntity) this.getEntityManager().find(theKlass, scriptUpdate.getParentId());
        }
        return null;
    }

    private VariableDescriptor getToReturn(String className, AbstractEntity theParent) {
        if (theParent != null) {
            switch (className) {
                case "TriggerDescriptor":
                    return (TriggerDescriptor) theParent;
                case "Result":
                    return ((Result) theParent).getChoiceDescriptor();
                case "Transition":
                    return ((Transition) theParent).getState().getStateMachine();
                case "State":
                    return ((State) theParent).getStateMachine();
            }
        }
        return null;
    }

    public List<AbstractEntity> batchUpdateInScriptTranslation(List<ScriptUpdate> scriptUpdates) throws ScriptException {
        List<AbstractEntity> ret = new ArrayList<>();
        for (ScriptUpdate update : scriptUpdates) {
            AbstractEntity updated = this.updateInScriptTranslation(update, UpdateType.MINOR);
            if (updated != null) {
                ret.add(updated);
            }
        }
        return ret;
    }

    private Object fishTranslationsByIndex(String impact, int index) throws ScriptException {
        Map<String, Object> args = new HashMap<>();
        args.put("impact", impact);
        args.put("index", index);

        ScriptContext ctx = new SimpleScriptContext();

        scriptFacade.nakedEval(getI18nJsHelper(), null, ctx);
        return scriptFacade.nakedEval("I18nHelper.getTranslationsByIndex()", args, ctx);
    }

    public String updateStatusInScript(String impact, int index, String newStatus) throws ScriptException {
        JSObject result = (JSObject) fishTranslationsByIndex(impact, index);

        if (result != null) {
            List<InScriptChange> langCodes = new ArrayList<>();

            for (String key : result.keySet()) {

                // TODO: store all indexes; sort them from end to start, update all statuses to newStatus
                JSObject translation = (JSObject) result.getMember(key);
                JSObject value = (JSObject) translation.getMember("value");
                JSObject member = (JSObject) value.getMember("properties");

                for (String key2 : member.keySet()) {
                    JSObject prop = (JSObject) member.getMember(key2);
                    if (((JSObject) prop.getMember("key")).getMember("value").equals("status")) {
                        JSObject statusProp = (JSObject) prop.getMember("value");

                        Integer[] indexes = getIndexes(impact, statusProp, "loc");
                        if (indexes != null) {
                            langCodes.add(new InScriptChange(indexes[0], indexes[1], "\"" + newStatus + "\""));
                        }
                    }
                }
            }

            if (!langCodes.isEmpty()) {
                StringBuilder sb = new StringBuilder(impact);

                Collections.sort(langCodes, new Comparator<InScriptChange>() {
                    @Override
                    public int compare(InScriptChange o1, InScriptChange o2) {
                        return o1.startIndex < o2.startIndex ? 1 : -1;
                    }
                });

                for (InScriptChange change : langCodes) {
                    // update lang code
                    sb.replace(change.startIndex - 1, change.endIndex + 1, change.newValue);
                }
                return sb.toString();
            }
        }

        return impact;
    }

    public AbstractEntity updateInScriptTranslation(ScriptUpdate scriptUpdate, UpdateType mode) throws ScriptException {
        AbstractEntity theParent = this.getParent(scriptUpdate);
        if (theParent != null) {
            VariableDescriptor toReturn = this.getToReturn(scriptUpdate.getParentClass(), theParent);
            if (toReturn != null) {
                if (toReturn.belongsToProtectedGameModel()) {
                    // theParent is a variableDescriptor
                    ModelScoped.Visibility visibility = toReturn.getVisibility();
                    if (visibility == ModelScoped.Visibility.PROTECTED || visibility == ModelScoped.Visibility.INTERNAL) {
                        return null;
                    }
                }

                try {
                    // fetch impact getter and setter
                    PropertyDescriptor property = new PropertyDescriptor(scriptUpdate.getFieldName(), theParent.getClass());
                    Method getter = property.getReadMethod();

                    // Fetch script to update
                    Script theScript = (Script) getter.invoke(theParent);
                    String source = theScript.getContent();

                    String status;
                    if (mode == UpdateType.MAJOR) {
                        status = "";
                        //TODO mark all as outdated
                        source = this.updateStatusInScript(source, scriptUpdate.getIndex(), "outdated::" + scriptUpdate.getCode());
                    } else if (mode == UpdateType.CATCH_UP) {
                        status = "";
                    } else {
                        status = null;
                    }
                    String updatedSource = this.updateScriptWithNewTranslation(source, scriptUpdate.getIndex(), scriptUpdate.getCode(), scriptUpdate.getValue(), status);
                    theScript.setContent(updatedSource);

                    Method setter = property.getWriteMethod();
                    setter.invoke(theParent, theScript);

                    return toReturn;

                } catch (IntrospectionException | InvocationTargetException | IllegalAccessException | IllegalArgumentException ex) {
                    logger.error("Error while setting {}({})#{}.{} to {}", scriptUpdate.getFieldName(), scriptUpdate.getParentId(), scriptUpdate.getFieldName(), scriptUpdate.getIndex(), scriptUpdate.getValue());
                }
            }
        }
        return null;
    }

    /**
     * Process each scriptUpdate.
     * For each scriptUpdaate, Replace the whole script by the new one.
     *
     * @param updates
     *
     * @return
     */
    public List<AbstractEntity> batchScriptUpdate(List<ScriptUpdate> updates) {
        List<AbstractEntity> ret = new ArrayList<>();
        for (ScriptUpdate scriptUpdate : updates) {
            AbstractEntity theParent = this.getParent(scriptUpdate);
            if (theParent != null) {
                VariableDescriptor toReturn = this.getToReturn(scriptUpdate.getParentClass(), theParent);

                if (toReturn != null) {

                    Boolean process = true;
                    if (toReturn.belongsToProtectedGameModel()) {
                        // theParent is a variableDescriptor
                        ModelScoped.Visibility visibility = toReturn.getVisibility();
                        if (visibility == ModelScoped.Visibility.PROTECTED || visibility == ModelScoped.Visibility.INTERNAL) {
                            process = false;
                        }
                    }
                    if (process) {
                        try {

                            // fetch impact getter and setter
                            PropertyDescriptor property = new PropertyDescriptor(scriptUpdate.getFieldName(), theParent.getClass());
                            Method getter = property.getReadMethod();

                            Script theScript = (Script) getter.invoke(theParent);

                            theScript.setContent(scriptUpdate.getValue());

                            Method setter = property.getWriteMethod();
                            setter.invoke(theParent, theScript);

                            if (toReturn != null) {
                                ret.add(toReturn);
                            }
                        } catch (IntrospectionException | InvocationTargetException | IllegalAccessException | IllegalArgumentException ex) {
                            logger.error("Error while setting {}({})#{} to {}", scriptUpdate.getFieldName(), scriptUpdate.getParentId(), scriptUpdate.getFieldName(), scriptUpdate.getIndex(), scriptUpdate.getValue());
                        }
                    }
                }
            }
        }
        return ret;
    }

    private static class TranslationsPrinter implements MergeableVisitor {

        private I18nFacade i18nFacade;

        private String[] languages;

        private StringBuilder sb = new StringBuilder();

        public TranslationsPrinter(String[] languages, I18nFacade i18nFacade) {
            this.languages = languages;
            this.i18nFacade = i18nFacade;
        }

        private void print(String msg, int level) {
            for (int i = 0; i < level; i++) {
                sb.append("    ");
            }
            sb.append(msg);
            sb.append(System.lineSeparator());
        }

        private void process(TranslatableContent trc, int level) {

            StringBuilder line = new StringBuilder();
            for (String code : languages) {
                String tr;
                Translation translation = trc.getTranslation(code);
                line.append("[").append(code);

                if (translation != null) {
                    if (Helper.isNullOrEmpty(translation.getStatus())) {
                        line.append("] ");
                    } else {
                        line.append(", ").append(translation.getStatus()).append("] ");
                    }

                    tr = translation.getTranslation();
                } else {
                    line.append("] ");
                    tr = "<N/A>";
                }

                line.append(tr);
                if (tr.length() < 30) {
                    for (int i = 0; i < 30 - tr.length(); i++) {
                        line.append(" ");
                    }
                }
                line.append("    ");
            }
            print(line.toString(), level + 1);

        }

        @Override
        public void visit(Mergeable target, ProtectionLevel protectionLevel, int level, WegasFieldProperties field, Deque<Mergeable> ancestors, Mergeable[] references) {
            if (target instanceof VariableDescriptor) {
                print(((VariableDescriptor) target).getName(), level);
            }

            if (field != null) {
                print(field.getField().getName(), level);
            }
            if (target instanceof TranslatableContent) {
                TranslatableContent trTarget = (TranslatableContent) target;
                process(trTarget, level);
            } else if (target instanceof Script) {
                try {
                    List<TranslatableContent> inscript = i18nFacade.getInScriptTranslations(((Script) target).getContent());
                    for (TranslatableContent trc : inscript) {
                        process(trc, level);
                    }
                    // hum ...
                } catch (ScriptException ex) {
                    logger.error("FAILS {}", ex);
                }
            }
        }

        @Override
        public String toString() {
            return sb.toString();
        }
    }

    public void printAllTranslations(Long gmId) {
        GameModel gameModel = gameModelFacade.find(gmId);
        List<String> collect = gameModel.getRawLanguages().stream().map(GameModelLanguage::getCode).collect(Collectors.toList());

        String[] langs = collect.toArray(new String[collect.size()]);

        this.printTranslations(gameModel, (String[]) langs);
    }

    public void printTranslations(Long gmId, String... languages) {
        this.printTranslations(gameModelFacade.find(gmId), languages);
    }

    public void printTranslations(GameModel target, String... languages) {
        TranslationsPrinter prettyPrinter = new TranslationsPrinter(languages, this);
        MergeHelper.visitMergeable(target, Boolean.TRUE, prettyPrinter);
        logger.error("Translation for {}{}{}", target, System.lineSeparator(), prettyPrinter);
    }


    /*
     * Translation Service
     */
    public boolean isTranslationServiceAvailable() {
        return Helper.getWegasProperty("deepl.enabled", "false").equals("true");
    }

    private Deepl getDeeplClient() {
        if (isTranslationServiceAvailable()) {
            return new Deepl(Helper.getWegasProperty("deepl.service_url", "https://api.deepl.com/v1"),
                    Helper.getWegasProperty("deepl.auth_key"));
        } else {
            throw WegasErrorMessage.error("No translation service");
        }
    }

    /**
     * Initialise or Override all TranslatedContent "targetLangCode" translations within the model using an newTranslation service.
     *
     *
     * @param gameModelId    id of the gameModel to translate
     * @param sourceLangCode reference language
     * @param targetLangCode language to update
     *
     * @return update gameModel
     */
    public GameModel initLanguage(Long gameModelId, String sourceLangCode, String targetLangCode) {
        GameModel gameModel = gameModelFacade.find(gameModelId);

        Deepl.Language sourceLang = Deepl.Language.valueOf(sourceLangCode.toUpperCase());
        Deepl.Language targetLang = Deepl.Language.valueOf(targetLangCode.toUpperCase());

        if (sourceLang != null) {
            if (gameModel.getLanguageByCode(sourceLangCode) != null) {
                if (targetLang != null) {
                    if (gameModel.getLanguageByCode(targetLangCode) != null) {

                        translateGameModel(gameModel, sourceLang.name(), targetLang.name());
                    } else {
                        throw WegasErrorMessage.error("Unsupported target language " + targetLangCode);
                    }

                } else {
                    throw WegasErrorMessage.error("Source language in not defined in the gameModel");
                }
            } else {
                throw WegasErrorMessage.error("Unsupported source language +");
            }
        } else {
            throw WegasErrorMessage.error("Source language in not defined in the gameModel");
        }

        return gameModel;
    }

    public DeeplUsage usage() {
        if (isTranslationServiceAvailable()) {
            return getDeeplClient().usage();
        } else {
            DeeplUsage usage = new DeeplUsage();
            usage.setCharacterCount(0l);
            usage.setCharacterLimit(0l);
            return usage;
        }
    }

    public DeeplTranslations.DeeplTranslation translate(String text, String sourceLangCode, String targetLangCode) {
        Deepl.Language sourceLang = Deepl.Language.valueOf(sourceLangCode.toUpperCase());
        Deepl.Language targetLang = Deepl.Language.valueOf(targetLangCode.toUpperCase());

        if (sourceLang != null) {
            if (targetLang != null) {

                Deepl deepl = getDeeplClient();

                DeeplTranslations translate = deepl.translate(sourceLang, targetLang, text);
                DeeplTranslations.DeeplTranslation translation = translate.getTranslations().get(0);

                return translation;

            } else {
                throw WegasErrorMessage.error("Unsupported target language " + targetLangCode);
            }
        } else {
            throw WegasErrorMessage.error("Unsupported source language +");
        }
    }

    public void translateScript(Script target, String sourceLangCode, String targetLangCode) {
        try {
            JSObject inscript = (JSObject) fishTranslationsByCode(target.getContent(), sourceLangCode);

            if (inscript != null) {
                int index = 0;
                String script = target.getContent();
                for (String key : inscript.keySet()) {
                    JSObject tr = (JSObject) inscript.getMember(key);

                    if (tr.getMember("status").equals("found")) {
                        JSObject translation = (JSObject) tr.getMember("value");
                        String source = (String) translation.getMember("translation");

                        DeeplTranslations.DeeplTranslation deepled = this.translate(source, sourceLangCode, targetLangCode);

                        script = this.updateScriptWithNewTranslation(script, index,
                                targetLangCode, deepled.getText(), "auto::" + sourceLangCode);
                    }
                    index++;
                }
                target.setContent(script);
            }

        } catch (ScriptException ex) {
            logger.error("Ouille ouille ouille: {}", ex);
        }

    }

    private void translateTranslatableContent(TranslatableContent trTarget, String sourceLangCode, String targetLangCode, ProtectionLevel protectionLevel) {
        Translation source = trTarget.getTranslation(sourceLangCode);

        if (source != null && !Helper.isNullOrEmpty(source.getTranslation())) {
            Visibility visibility = trTarget.getInheritedVisibility();
            if (Helper.isProtected(protectionLevel, visibility)) {
                // target is protected:don't touch !
                return;
            }

            DeeplTranslations.DeeplTranslation translate = this.translate(source.getTranslation(), sourceLangCode, targetLangCode);
            trTarget.updateTranslation(targetLangCode, translate.getText());

        }

    }

    /**
     * Copy newTranslation from one set of mergeables to another one
     */
    private static class Translator implements MergeableVisitor {

        private final I18nFacade facade;

        private final String sourceLangCode;
        private final String targetLangCode;

        public Translator(String sourceLangCode, String targetLangCode, I18nFacade facade) {
            this.sourceLangCode = sourceLangCode;
            this.targetLangCode = targetLangCode;
            this.facade = facade;
        }

        @Override
        public void visit(Mergeable target, ProtectionLevel protectionLevel, int level, WegasFieldProperties field, Deque<Mergeable> ancestors, Mergeable[] references) {
            if (target instanceof TranslatableContent) {
                facade.translateTranslatableContent((TranslatableContent) target, sourceLangCode, targetLangCode, protectionLevel);
            }

            if (target instanceof Script) {
                facade.translateScript((Script) target, sourceLangCode, targetLangCode);
            }
        }
    }

    private void translateGameModel(Mergeable target, String sourceLangCode, String targetLangCode) {
        MergeHelper.visitMergeable(target, Boolean.TRUE, new Translator(sourceLangCode, targetLangCode, this));
    }

    private static class LanguageUpgrader implements MergeableVisitor {

        private final String oldCode;
        private final String newCode;
        private final I18nFacade i18nFacade;

        public LanguageUpgrader(String oldCode, String newCode, I18nFacade i18nFacade) {
            this.oldCode = oldCode;
            this.newCode = newCode;
            this.i18nFacade = i18nFacade;
        }

        @Override
        public void visit(Mergeable target, ProtectionLevel protectionLevel, int level, WegasFieldProperties field, Deque<Mergeable> ancestors, Mergeable[] references) {
            if (target instanceof TranslatableContent) {
                TranslatableContent tr = (TranslatableContent) target;
                Translation translation = tr.getTranslation(oldCode);
                if (translation != null) {
                    translation.setLang(newCode);
                }
            }

            if (target instanceof Script) {
                try {
                    Script script = (Script) target;
                    String newScript = i18nFacade.updateCodeInScript(script.getContent(), oldCode, newCode);
                    script.setContent(newScript);
                } catch (ScriptException ex) {
                    logger.error("SCRIPTERROR");
                }
            }
        }
    }

    /**
     * Update each occurence of the language code in the given gameModel.
     * each TranslatableContent property and each TranslatableContnent in any script will be updated.
     *
     * @param gameModel
     * @param oldCode
     * @param newCode
     */
    public void updateTranslationCode(GameModel gameModel, String oldCode, String newCode) {
        MergeHelper.visitMergeable(gameModel, Boolean.TRUE, new LanguageUpgrader(oldCode, newCode, this));
    }

    /**
     * Update newTranslation in target for given language.
     *
     *
     * @param target       the script to update
     * @param source       the script which contains up to date newTranslation
     * @param reference    previous version of source
     * @param languageCode language to update
     */
    private void importTranslationsInScript(Script target, Script source, Script reference, String languageCode, boolean shouldKeepUserTranslation) {
        try {
            JSObject inTarget = (JSObject) fishTranslationsByCode(target.getContent(), languageCode);
            JSObject inSource = (JSObject) fishTranslationsByCode(source.getContent(), languageCode);

            JSObject inRef = null;
            if (reference != null) {
                inRef = (JSObject) fishTranslationsByCode(reference.getContent(), languageCode);
            }

            if (inTarget != null && inSource != null) {
                if (doesPathLocationsMatches(inTarget, inSource)) {
                    if (inRef == null || doesPathLocationsMatches(inTarget, inRef)) {
                        int index = 0;
                        String script = target.getContent();
                        for (String key : inTarget.keySet()) {
                            JSObject trTarget = (JSObject) inTarget.getMember(key);
                            JSObject trSource = (JSObject) inSource.getMember(key);
                            JSObject trRef = null;

                            if (inRef != null) {
                                trRef = (JSObject) inRef.getMember(key);
                            }

                            String newTranslation = null;
                            String currentTranslation = null;
                            String previousTranslation = null;
                            String newStatus = null;

                            // any new newTranslation in the source ?
                            if (trSource.getMember("status").equals("found")) {
                                newTranslation = (String) ((JSObject) trSource.getMember("value")).getMember("translation");
                                newStatus = (String) ((JSObject) trSource.getMember("value")).getMember("status");
                            }
                            // has current newTranslation ?
                            if (trTarget.getMember("status").equals("found")) {
                                currentTranslation = (String) ((JSObject) trTarget.getMember("value")).getMember("translation");
                            }

                            if (trRef != null && trRef.getMember("status").equals("found")) {
                                previousTranslation = (String) ((JSObject) trRef.getMember("value")).getMember("translation");
                            }

                            if (newTranslation == null) {
                                if (previousTranslation != null && currentTranslation != null) {
                                    // TODO: implement "remove Language"
                                    script = this.updateScriptWithNewTranslation(script, index, languageCode, "", "deleted");
                                }
                            } else {
                                if (!shouldKeepUserTranslation || previousTranslation == null || currentTranslation == null || previousTranslation.equals(currentTranslation)) {
                                    logger.debug("Import {}::{} from {}->{} in {}, ", languageCode, newTranslation, reference, source, target);
                                    script = this.updateScriptWithNewTranslation(script, index, languageCode, newTranslation, newStatus);
                                }
                            }

                            index++;
                        }
                        target.setContent(script);
                    } else {
                        logger.error("Reference Structure does not match; {} VS {}", target, reference);
                    }
                } else {
                    logger.error("Structure does not match; {} VS {}", target, source);
                }
            }

        } catch (ScriptException ex) {
            logger.error("Ouille ouille ouille: {}", ex);
        }

    }

    /**
     * Copy newTranslation from one set of mergeables to another one
     */
    private static class TranslationsImporter implements MergeableVisitor {

        private final String languageCode;
        private final I18nFacade i18nFacade;

        public TranslationsImporter(String languageCode, I18nFacade i18nFacade) {
            this.languageCode = languageCode;
            this.i18nFacade = i18nFacade;
        }

        @Override
        public void visit(Mergeable target, ProtectionLevel protectionLevel, int level, WegasFieldProperties field, Deque<Mergeable> ancestors, Mergeable references[]) {

            if (target instanceof TranslatableContent) {
                boolean shouldKeepUserTranslation = false;
                TranslatableContent trContentTarget = (TranslatableContent) target;
                Translation trTarget = trContentTarget.getTranslation(languageCode);
                String currentTranslation = null;
                boolean hasNewTrContent = false;
                String newTranslation = null;
                String previousTranslation = null;

                if (trTarget != null) {
                    currentTranslation = trTarget.getTranslation();
                    Visibility visibility = target.getInheritedVisibility();
                    if (!Helper.isProtected(protectionLevel, visibility)) {
                        // target is not protected, keep target newTranslation
                        shouldKeepUserTranslation = true;
                    }
                }

                if (references.length > 0 && references[0] instanceof TranslatableContent) {
                    hasNewTrContent = true;
                    TranslatableContent trContentSource = (TranslatableContent) references[0];
                    Translation trSource = trContentSource.getTranslation(languageCode);

                    if (trSource != null) {
                        newTranslation = trSource.getTranslation();
                    }
                }

                if (references.length > 1 && references[1] instanceof TranslatableContent) {
                    TranslatableContent trContentRef;
                    Translation trRef;

                    trContentRef = (TranslatableContent) references[1];
                    trRef = trContentRef.getTranslation(languageCode);
                    if (trRef != null) {
                        previousTranslation = trRef.getTranslation();
                    }
                }

                if (newTranslation == null) {
                    if (previousTranslation != null && hasNewTrContent) {
                        //only remove the translation if the newTrContent stil exists
                        trContentTarget.removeTranslation(languageCode);
                    }
                } else {
                    if (!shouldKeepUserTranslation || previousTranslation == null || currentTranslation == null || previousTranslation.equals(currentTranslation)) {
                        trContentTarget.updateTranslation(languageCode, newTranslation);
                    }
                }
            } else {
                logger.debug("No TranslationContent in source");
            }

            if (target instanceof Script && references.length > 0 && references[0] instanceof Script) {
                Script ref = null;
                if (references.length > 1) {
                    ref = (Script) references[1];
                }

                boolean shouldKeepUserTranslation = false;
                Visibility visibility = target.getInheritedVisibility();
                if (!Helper.isProtected(protectionLevel, visibility)) {
                    // target is not protected, keep target newTranslation
                    shouldKeepUserTranslation = true;
                }
                i18nFacade.importTranslationsInScript((Script) target, (Script) references[0], ref, languageCode, shouldKeepUserTranslation);
            }
        }
    }

    public void importTranslations(Mergeable target, Mergeable source, Mergeable sourceRef, String languageCode) {
        MergeHelper.visitMergeable(target, Boolean.TRUE, new TranslationsImporter(languageCode, this), source, sourceRef);
    }
}
