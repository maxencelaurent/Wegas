/*
 * Wegas
 * http://www.albasim.ch/wegas/
 *
 * Copyright (c) 2013 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.leaderway.persistence;

import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.variable.VariableInstance;
import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Embeddable;
import javax.persistence.Entity;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;
import org.codehaus.jackson.annotate.JsonTypeInfo;

/**
 *
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
@Entity
public class TaskInstance extends VariableInstance {

    private static final long serialVersionUID = 1L;
    /**
     *
     */
    private Boolean active = true;
    /**
     *
     */
    private Integer duration;
    /**
     *
     */
    @ElementCollection
    private Map<String, String> properties = new HashMap<>();
    /**
     * @deprecated
     */
    @ElementCollection
    private Map<String, WRequirement> skillset = new HashMap<>();

    
    
    /**
     *
     * @param a
     */
    @Override
    public void merge(AbstractEntity a) {
        TaskInstance other = (TaskInstance) a;
        this.setActive(other.getActive());
        this.setDuration(other.getDuration());
        this.properties.clear();
        this.properties.putAll(other.getProperties());
        this.skillset.clear();
        this.skillset.putAll(other.getSkillset());
    }

    /**
     * @return the active
     */
    public Boolean getActive() {
        return this.active;
    }

    /**
     * @param active the active to set
     */
    public void setActive(Boolean active) {
        this.active = active;
    }

    /**
     * @return the duration
     */
    public Integer getDuration() {
        return duration;
    }

    /**
     * @param duration the duration to set
     */
    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    /**
     * @return the properties
     */
    public Map<String, String> getProperties() {
        return this.properties;
    }

    /**
     * @param properties the properties to set
     */
    public void setProperties(Map<String, String> properties) {
        this.properties = properties;
    }

    /**
     *
     * @param key
     * @param val
     */
    public void setProperty(String key, String val) {
        this.properties.put(key, val);
    }

    /**
     *
     * @param key
     * @return
     */
    public String getProperty(String key) {
        return this.properties.get(key);
    }

    /**
     * @return the skillset
     */
    public Map<String, WRequirement> getSkillset() {
        return this.skillset;
    }

    /**
     * @param skillset the skillset to set
     */
    public void setSkillset(Map<String, WRequirement> skillset) {
        this.skillset = skillset;
    }

    /**
     *
     * @param key
     * @param WRequirement
     */
    public void setSkillset(String key, WRequirement val) {
        this.skillset.put(key, val);
    }

    /**
     *
     * @param key
     * @return
     */
    public WRequirement getSkillset(String key) {
        return this.skillset.get(key);
        //return this.getDescriptor().getSk
    }
}
