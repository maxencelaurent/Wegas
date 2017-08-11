/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.mcq.persistence;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.Helper;
import com.wegas.core.ejb.VariableInstanceFacade;
import com.wegas.core.exception.client.WegasIncompatibleType;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.DatedEntity;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import com.wegas.core.persistence.variable.Beanjection;
import com.wegas.core.rest.util.Views;
import com.wegas.mcq.ejb.QuestionDescriptorFacade;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.persistence.*;

/**
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
@JsonTypeName(value = "Reply")
@Table(name = "MCQReply", indexes = {
    @Index(columnList = "choiceinstance_id"),
    @Index(columnList = "replies_id")
})
public class Reply extends AbstractEntity implements DatedEntity {

    private static final long serialVersionUID = 1L;
    /**
     *
     */
    @Id
    @GeneratedValue
    @JsonView(Views.IndexI.class)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(columnDefinition = "timestamp with time zone")
    @WegasEntityProperty
    private Date createdTime = new Date();
    /**
     * /
     **
     * <p>
     */
    @WegasEntityProperty
    private Long startTime;
    /**
     *
     */
    @Column(columnDefinition = "boolean default false")
    @WegasEntityProperty
    private Boolean unread = false;
    /**
     *
     */
    @Column(columnDefinition = "boolean default false")
    @WegasEntityProperty
    private Boolean ignored = false;
    /**
     *
     */
    @ManyToOne(optional = false)
    private Replies replies;

    @Transient
    @WegasEntityProperty
    private String resultName;

    @Transient
    @WegasEntityProperty
    private String choiceName;

    /**
     *
     */
    @ManyToOne(optional = false)
    @JoinColumn(name = "choiceinstance_id", nullable = false)
    @JsonBackReference
    private ChoiceInstance choiceInstance;

    /**
     * @param a
     */
    @Override
    public void __merge(AbstractEntity a) {
    }

    /**
     * @return the ignored status.
     */
    public Boolean getIgnored() {
        return ignored;
    }

    /**
     * @param ignored the ignored status to set.
     */
    public void setIgnored(Boolean ignored) {
        this.ignored = ignored;
    }

    @Override
    public Long getId() {
        return this.id;
    }

    /**
     * @return the createdTime
     */
    @Override
    public Date getCreatedTime() {
        return createdTime != null ? new Date(createdTime.getTime()) : null;
    }

    /**
     * @param createdTime the createdTime to set
     */
    public void setCreatedTime(Date createdTime) {
        this.createdTime = createdTime != null ? new Date(createdTime.getTime()) : null;
    }

    /**
     * @return the MCQDescriptor
     */
    @JsonIgnore
    @JsonBackReference
    public ChoiceInstance getChoiceInstance() {
        return choiceInstance;
    }

    /**
     * @param choiceInstance
     */
    @JsonBackReference
    public void setChoiceInstance(ChoiceInstance choiceInstance) {
        this.choiceInstance = choiceInstance;
    }

    public String getChoiceName() {
        if (!Helper.isNullOrEmpty(choiceName)) {
            return choiceName;
        }
        if (this.getResult() != null && this.getResult().getChoiceDescriptor() != null) {
            return this.getResult().getChoiceDescriptor().getName();
        } else {
            return null;
        }
    }

    public void setChoiceName(String choiceName) {
        this.choiceName = choiceName;
    }

    public String getResultName() {
        if (resultName != null) {
            // for backward compat, empty string is a valid result name
            return resultName;
        }
        if (this.getResult() != null) {
            return this.getResult().getName();
        } else {
            return null;
        }
    }

    public void setResultName(String resultName) {
        this.resultName = resultName;
    }

    /**
     * @return true if the reply has not yet been read by a player
     */
    public Boolean getUnread() {
        return unread;
    }

    /**
     * @param unread
     */
    public void setUnread(Boolean unread) {
        this.unread = unread;
    }

    /**
     * @return the startTime
     */
    public Long getStartTime() {
        return startTime;
    }

    /**
     * @param startTime the startTime to set
     */
    public void setStartTime(Long startTime) {
        this.startTime = startTime;
    }

    /**
     * @return the result
     */
    @JsonIgnore
    public Result getResult() {
        return replies.getResult();
    }

    public void setResult(Result r) {
        this.replies = r.getReplies();
        this.setResultName(null);
        this.setChoiceName(null);
    }

    public String getAnswer() {
        Result result = this.getResult();
        if (result != null) {
            return result.getAnswer();
        } else {
            return "";
        }
    }

    public void setAnswer(String answer) {
        // Make Jackson happy
    }

    public String getIgnorationAnswer() {
        Result result = this.getResult();
        if (result != null) {
            return result.getIgnorationAnswer();
        } else {
            return "";
        }
    }

    public void setIgnorationAnswer(String answer) {
        // Make Jackson happy
    }

    public List<String> getFiles() {
        Result result = this.getResult();
        if (result != null) {
            return result.getFiles();
        } else {
            return new ArrayList<>();
        }
    }

    public void setFiles(List<String> files) {
        // Make Jackson happy
    }

    @JsonIgnore
    public Replies getReplies() {
        return replies;
    }

    public void setReplies(Replies replies) {
        this.replies = replies;
    }

    @Override
    public void updateCacheOnDelete(Beanjection beans) {
        QuestionDescriptorFacade qF = beans.getQuestionDescriptorFacade();
        VariableInstanceFacade vif = beans.getVariableInstanceFacade();
        ChoiceInstance cInst = this.getChoiceInstance();
        if (cInst != null) {
            cInst = (ChoiceInstance) vif.find(cInst.getId());
            if (cInst != null) {
                cInst.removeReply(this);
            }
        }

        Result theResult = this.getResult();
        if (theResult != null) {
            theResult = qF.findResult(theResult.getId());
            if (theResult != null) {
                theResult.removeReply(this);
            }
        }

        super.updateCacheOnDelete(beans);
    }
}
